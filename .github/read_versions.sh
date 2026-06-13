# Sourced by CI jobs that need versions from nix/versions.nix.
# Usage:  source .github/read_versions.sh
# Exports: MOKU_VERSION  SUWA_VERSION  SUWA_HASH_LINUX  SUWA_HASH_MACOS_ARM64  SUWA_HASH_MACOS_X64  SUWA_HASH_WINDOWS
#
# Uses only POSIX -E grep (no -P) so this works on both GNU grep (Linux/Windows)
# and BSD grep (macOS), which does not support -P/PCRE.

_nix="$( cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd )/nix/versions.nix"
_t=$(cat "$_nix")

# Match `key = "value"` with -E, then strip the surrounding quotes.
_pick() { echo "$_t" | grep -oE "${1}"'[[:space:]]*=[[:space:]]*"[^"]+"' | grep -oE '"[^"]+"' | tr -d '"'; }

export MOKU_VERSION=$(_pick "moku")
export SUWA_VERSION=$(_pick "version")
export SUWA_HASH_WINDOWS=$(_pick "windowsHash")
export SUWA_HASH_LINUX=$(_pick "linuxHash")
export SUWA_HASH_MACOS_ARM64=$(_pick "macosArm64Hash")
export SUWA_HASH_MACOS_X64=$(_pick "macosX64Hash")

unset _nix _t
unset -f _pick
