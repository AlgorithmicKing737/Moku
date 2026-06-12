{
  moku = "0.10.0";

  suwayomi = {
    version = "2.2.2196";
    hash = "sha256-jnJEwmlFZmGodwX3RvDYcnV3Cql2urfGkg5NUT6Xw/Y=";
    windowsHash = "457ca4a64a57e0d274a87203d25e962103bcb456ee30ada3ea47328a3093329d";
    linuxHash   = "e13d63ceb7e2b15e83d0a78281e8c1c04ac4a833caa73e5a2b68fbaf0cb20c1f";
    macosArm64Hash = "9e3dbebc7475707e8d11c56a473385c00b09bde0103d013bc1cb3d06c89e5c43";
    macosX64Hash   = "eadee02060b780a5febfb8dada2f89c7bd7db5905cfd20d47eaca02fcde8c9c5";
  };

  frontend = {
    pnpmHash   = "sha256-18twdFhprV9v9hzvqxuVDHD6Tm4zHNDJs7s6l/7ClBo=";
    distHash   = "7db288b4b54277aa82b6ec5b21fc31a1e71f8246c50a74777500083b806c1fa5";
    distHashSri = "sha256-Z27CJz/9mmkkiEnF1R3E1ZpdW2j7unpP5+e1cqXyXxQ=";
  };

  gitDeps = {
    tauri-plugin-discord-rpc = "sha256-xq0qyK2NrwSAFDhXo0vbvcygRD2/7uqBaLpqfpfxkrc=";
  };

  gitCommit  = "239960683b6c7f1347e1798b0e179a8a46628728";
  tarballHash = "";
}
