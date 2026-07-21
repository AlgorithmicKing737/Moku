{
  moku = "0.10.2";

  suwayomi = {
    version = "2.3.2243";
    hash = "sha256-ghFBsy4XDUoC08vf7Vd+2PB70iOD/19BMuu1rkDpjdU=";
    windowsHash = "895843f48d5735e01bdc43d79ab66e600d6f507076a9b792ffa418a9bbcc32c2";
    linuxHash   = "7ed20b7890a6720c4d5dd51fe9c3247f537ffcab01a1cba5c2a75626743236c3";
    macosArm64Hash = "884df50945c9c052ec55bea8bb6fd232f9258a5a0bb8a95d2e07850337b2481b";
    macosX64Hash   = "3021ce25ed0366bd91899621ff5e4f0ac0e11be292daa37a9c3dfac9bd7c9591";
  };

  frontend = {
    pnpmHash   = "sha256-/faEmma6meikz1FMBkjeHfyG18H0j7JHVLM57XQ9MNM=";
    distHash   = "7db288b4b54277aa82b6ec5b21fc31a1e71f8246c50a74777500083b806c1fa5";
    distHashSri = "sha256-uHclJeIlYMGZ52klCN40bw/cv7ozou4GyQb8YJ/8fn4=";
  };

  gitDeps = {
    tauri-plugin-discord-rpc = "sha256-xq0qyK2NrwSAFDhXo0vbvcygRD2/7uqBaLpqfpfxkrc=";
  };

  gitCommit  = "239960683b6c7f1347e1798b0e179a8a46628728";
  tarballHash = "28623370a75ce6e0e741605eedba9ed4f3ba9115556c22bafe8312e8fed95d95";
}
