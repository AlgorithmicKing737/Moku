{ pkgs, rustToolchain, version, versions }:

{
  bump = pkgs.writeShellApplication {
    name = "moku-bump";
    runtimeInputs = with pkgs; [
      gnused
      coreutils
      git
      rustToolchain
      nodejs_22
      pnpm
      (python3.withPackages (ps: [ ps.aiohttp ps.tomlkit ]))
    ];
    text = ''
      [[ $# -lt 1 ]] && { echo "Usage: nix run .#bump -- <version>"; exit 1; }
      VERSION="$1"
      REPO="$(git rev-parse --show-toplevel)"

      sed -i "s/moku = \"[^\"]*\"/moku = \"$VERSION\"/" "$REPO/nix/versions.nix"
      sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$REPO/src-tauri/tauri.conf.json"
      sed -i "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" "$REPO/src-tauri/Cargo.toml"
      sed -i "s/^pkgver=.*/pkgver=$VERSION/" "$REPO/PKGBUILD"
      sed -i "s/^pkgrel=.*/pkgrel=1/" "$REPO/PKGBUILD"

      (cd "$REPO/src-tauri" && cargo generate-lockfile)

      cd "$REPO"
      pnpm install --frozen-lockfile
      pnpm build:static

      tar -czf "$REPO/packaging/frontend-dist.tar.gz" -C "$REPO" dist
      FRONTEND_SHA_HEX=$(sha256sum "$REPO/packaging/frontend-dist.tar.gz" | awk '{print $1}')
      FRONTEND_SHA_SRI=$(echo "$FRONTEND_SHA_HEX" | xxd -r -p | base64 -w0 | sed 's/^/sha256-/')

      sed -i "s|distHash = \"[^\"]*\"|distHash = \"$FRONTEND_SHA_HEX\"|" "$REPO/nix/versions.nix"
      sed -i "s|distHashSri = \"[^\"]*\"|distHashSri = \"$FRONTEND_SHA_SRI\"|" "$REPO/nix/versions.nix"

      MANIFEST="$REPO/io.github.moku_project.Moku.yml"
      sed -i "s/tag: v[^[:space:]]*/tag: v$VERSION/" "$MANIFEST"
      python3 - "$MANIFEST" "$FRONTEND_SHA_HEX" <<'PYEOF'
import re, sys
path, sha = sys.argv[1], sys.argv[2]
text = open(path).read()
updated, n = re.subn(
  r'(path:\s*packaging/frontend-dist\.tar\.gz\s*\n\s*sha256:\s*)[0-9a-f]+',
  r'\g<1>' + sha, text)
if n == 0:
    sys.exit("ERROR: could not find frontend-dist sha256 in manifest")
open(path, 'w').write(updated)
PYEOF

      python3 "$REPO/packaging/flatpak-cargo-generator.py" \
        "$REPO/src-tauri/Cargo.lock" \
        -o "$REPO/packaging/cargo-sources.json"

      echo "Bumped to v$VERSION — commit, tag, push, then: nix run .#update -- $VERSION"
    '';
  };

  update = pkgs.writeShellApplication {
    name = "moku-update";
    runtimeInputs = with pkgs; [ gnused coreutils git curl nix xxd ];
    text = ''
      REPO="$(git rev-parse --show-toplevel)"
      VERSIONS="$REPO/nix/versions.nix"
      MANIFEST="$REPO/io.github.moku_project.Moku.yml"
      PKGBUILD="$REPO/PKGBUILD"

      if [[ $# -ge 1 ]]; then
        VERSION="$1"
      else
        VERSION=$(grep 'moku = "' "$VERSIONS" | head -1 | sed 's/.*"\(.*\)".*/\1/')
      fi

      COMMIT=$(git ls-remote https://github.com/moku-project/Moku.git "refs/tags/v$VERSION" | awk '{print $1}')
      [[ -z "$COMMIT" ]] && { echo "ERROR: tag v$VERSION not found on remote"; exit 1; }
      sed -i "s/gitCommit = \"[^\"]*\"/gitCommit = \"$COMMIT\"/" "$VERSIONS"
      sed -i "s/commit: [0-9a-f]\{40\}/commit: $COMMIT/" "$MANIFEST"

      TARBALL_URL="https://github.com/moku-project/Moku/archive/refs/tags/v$VERSION.tar.gz"
      TARBALL_SHA=$(curl -fsSL "$TARBALL_URL" | sha256sum | awk '{print $1}')
      sed -i "s/tarballHash = \"[^\"]*\"/tarballHash = \"$TARBALL_SHA\"/" "$VERSIONS"
      sed -i "/sha256sums=/,/)/{ 0,/'/s/'[^']*'/'$TARBALL_SHA'/ }" "$PKGBUILD"

      if [[ $# -ge 2 ]]; then
        SUWA_VER="$2"
        BASE="https://github.com/Suwayomi/Suwayomi-Server-preview/releases/download/v${SUWA_VER}"

        echo "Fetching Suwayomi v${SUWA_VER} hashes (5 downloads)..."

        sha_of() { curl -fsSL "$1" | sha256sum | awk '{print $1}'; }
        to_sri()  { echo "$1" | xxd -r -p | base64 -w0 | sed 's/^/sha256-/'; }

        JAR_SHA=$(sha_of    "${BASE}/Suwayomi-Server-v${SUWA_VER}.jar")
        WIN_SHA=$(sha_of    "${BASE}/Suwayomi-Server-v${SUWA_VER}-windows-x64.zip")
        LINUX_SHA=$(sha_of  "${BASE}/Suwayomi-Server-v${SUWA_VER}-linux-x64.tar.gz")
        ARM64_SHA=$(sha_of  "${BASE}/Suwayomi-Server-v${SUWA_VER}-macOS-arm64.tar.gz")
        X64_SHA=$(sha_of    "${BASE}/Suwayomi-Server-v${SUWA_VER}-macOS-x64.tar.gz")

        JAR_SRI=$(to_sri "$JAR_SHA")

        sed -i "s/version = \"[^\"]*\"/version = \"${SUWA_VER}\"/"         "$VERSIONS"
        sed -i "s|hash = \"sha256-[^\"]*\"|hash = \"${JAR_SRI}\"|"         "$VERSIONS"
        sed -i "s|windowsHash = \"[^\"]*\"|windowsHash = \"${WIN_SHA}\"|"   "$VERSIONS"
        sed -i "s|linuxHash = \"[^\"]*\"|linuxHash = \"${LINUX_SHA}\"|"     "$VERSIONS"
        sed -i "s|macosArm64Hash = \"[^\"]*\"|macosArm64Hash = \"${ARM64_SHA}\"|" "$VERSIONS"
        sed -i "s|macosX64Hash = \"[^\"]*\"|macosX64Hash = \"${X64_SHA}\"|" "$VERSIONS"

        sed -i "s|Suwayomi-Server-preview/releases/download/v[^/]*/|Suwayomi-Server-preview/releases/download/v${SUWA_VER}/|" "$MANIFEST"
        sed -i "s|Suwayomi-Server-v[0-9.]*\.jar|Suwayomi-Server-v${SUWA_VER}.jar|g" "$MANIFEST"
        python3 - "$MANIFEST" "$JAR_SHA" <<'PYEOF'
import re, sys
path, sha = sys.argv[1], sys.argv[2]
text = open(path).read()
updated, n = re.subn(
  r'(dest-filename:\s*Suwayomi-Server\.jar\s*\n\s*sha256:\s*)[0-9a-f]+',
  r'\g<1>' + sha, text)
if n == 0:
    sys.exit("ERROR: could not find Suwayomi jar sha256 in manifest")
open(path, 'w').write(updated)
PYEOF

        echo "Suwayomi hashes written."
      fi

      echo "Done — versions.nix, flatpak manifest, and PKGBUILD patched for v$VERSION"
    '';
  };

  flatpak = pkgs.writeShellApplication {
    name = "moku-flatpak";
    runtimeInputs = with pkgs; [ coreutils git appstream flatpak-builder flatpak ];
    text = ''
      REPO="$(git rev-parse --show-toplevel)"
      rm -rf "$REPO/build-dir" "$REPO/repo"
      flatpak-builder \
        --repo="$REPO/repo" \
        --force-clean \
        "$REPO/build-dir" \
        "$REPO/io.github.moku_project.Moku.yml"
      flatpak build-bundle "$REPO/repo" "$REPO/moku.flatpak" io.github.moku_project.Moku
      rm -rf "$REPO/build-dir" "$REPO/repo"
      echo "moku.flatpak created"
    '';
  };

  tunnel = pkgs.writeShellApplication {
    name = "moku-tunnel";
    runtimeInputs = with pkgs; [ cloudflared ];
    text = ''
      PORT="''${1:-4567}"
      cloudflared tunnel --url "http://localhost:$PORT"
    '';
  };
}
