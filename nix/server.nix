{
  lib,
  stdenvNoCC,
  fetchurl,
  makeWrapper,
  jdk21_headless,
  versions,
}:
let
  jdk = jdk21_headless;
  ver = versions.suwayomi;
in
stdenvNoCC.mkDerivation {
  pname = "suwayomi-server";
  version = ver.version;

  src = fetchurl {
    url = "https://github.com/Suwayomi/Suwayomi-Server-preview/releases/download/v${ver.version}/Suwayomi-Server-v${ver.version}.jar";
    hash = ver.hash;
  };

  nativeBuildInputs = [ makeWrapper ];

  dontUnpack = true;

  buildPhase = ''
    runHook preBuild

    install -Dm644 $src $out/share/suwayomi-server/suwayomi-server.jar

    makeWrapper ${jdk}/bin/java $out/bin/suwayomi-server \
      --add-flags "-Dsuwayomi.tachidesk.config.server.initialOpenInBrowserEnabled=false" \
      --add-flags "-jar $out/share/suwayomi-server/suwayomi-server.jar"

    runHook postBuild
  '';

  meta = {
    description = "Free and open source manga reader server that runs extensions built for Mihon (Tachiyomi)";
    homepage = "https://github.com/Suwayomi/Suwayomi-Server";
    downloadPage = "https://github.com/Suwayomi/Suwayomi-Server-preview/releases";
    changelog = "https://github.com/Suwayomi/Suwayomi-Server-preview/releases/tag/v${ver.version}";
    license = lib.licenses.mpl20;
    platforms = jdk.meta.platforms;
    sourceProvenance = [ lib.sourceTypes.binaryBytecode ];
    mainProgram = "suwayomi-server";
  };
}
