{
  description = "Moku — manga reader frontend for Suwayomi";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, rust-overlay, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      perSystem =
        { system, lib, ... }:
        let
          versions = import ./nix/versions.nix;
          version = versions.moku;

          pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [ rust-overlay.overlays.default ];
          };

          rustToolchain = pkgs.rust-bin.stable.latest.default.override {
            extensions = [
              "rust-src"
              "rust-analyzer"
            ];
          };

          runtimeLibs = with pkgs; [
            webkitgtk_4_1
            gtk3
            glib
            cairo
            pango
            atk
            gdk-pixbuf
            libsoup_3
            openssl
            dbus
            libappindicator-gtk3
            gsettings-desktop-schemas
          ];

          src = lib.cleanSourceWith {
            src = ./.;
            filter =
              path: type:
              let
                base = builtins.baseNameOf path;
              in
              (lib.hasInfix "/src" path)
              || (lib.hasInfix "/src-tauri/src" path)
              || (lib.hasInfix "/src-tauri/icons" path)
              || (lib.hasInfix "/src-tauri/capabilities" path)
              || (lib.hasInfix "/static" path)
              || base == "index.html"
              || base == "package.json"
              || base == "pnpm-lock.yaml"
              || base == "pnpm-workspace.yaml"
              || base == "tsconfig.json"
              || base == "vite.config.ts"
              || base == "svelte.config.js"
              || base == "Cargo.toml"
              || base == "Cargo.lock"
              || base == "build.rs"
              || base == "tauri.conf.json";
          };

          suwayomiServer = pkgs.callPackage ./nix/server.nix { inherit versions; };

          moku = pkgs.callPackage ./nix/moku.nix {
            inherit lib pkgs rustToolchain runtimeLibs suwayomiServer version src versions;
            appIcon = ./src/lib/assets/moku-icon.svg;
          };

          scripts = import ./nix/scripts.nix { inherit pkgs rustToolchain version versions; };

        in
        {
          packages = {
            inherit moku suwayomiServer;
            default = moku;
          };

          apps = {
            default = { type = "app"; program = "${moku}/bin/moku"; };
            moku    = { type = "app"; program = "${moku}/bin/moku"; };
            bump    = { type = "app"; program = "${scripts.bump}/bin/moku-bump"; };
            update  = { type = "app"; program = "${scripts.update}/bin/moku-update"; };
            flatpak = { type = "app"; program = "${scripts.flatpak}/bin/moku-flatpak"; };
            tunnel  = { type = "app"; program = "${scripts.tunnel}/bin/moku-tunnel"; };
          };

          devShells.default = pkgs.mkShell {
            buildInputs = runtimeLibs;
            nativeBuildInputs = with pkgs; [
              rustToolchain
              pkg-config
              wrapGAppsHook3
              nodejs_22
              pnpm
              suwayomiServer
              cloudflared
              xdg-utils
              (python3.withPackages (ps: [
                ps.aiohttp
                ps.tomlkit
              ]))
            ];
            shellHook = ''
              export NO_STRIP=true
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig''${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
              export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}''${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath runtimeLibs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

              echo "Moku dev shell — pnpm install && pnpm tauri:dev"
              echo ""
              echo "  nix run .#bump   -- <ver>   bump version + rebuild frontend"
              echo "  git commit && git tag && git push"
              echo "  nix run .#update -- <ver>   fetch hashes + patch all configs"
              echo "  nix run .#flatpak           build flatpak bundle"
              echo "  nix run .#tunnel -- [port]  expose local server via cloudflare"
            '';
          };

          formatter = pkgs.nixfmt-rfc-style;
        };
    };
}
