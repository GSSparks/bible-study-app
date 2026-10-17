{
  description = "Scriptorium — self-hosted Bible study platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          # Build-time tools — go into PATH
          nativeBuildInputs = with pkgs; [
            nodejs_22   # runtime + npm (LTS)
            python3     # required by node-gyp (builds node-sword-interface + argon2)
            gnumake     # required by node-gyp
            gcc         # C++ compiler for native modules
            pkg-config  # used by node-sword-interface to locate libsword
          ];

          # Libraries — headers + .so files made available to the compiler/linker.
          # mkShell automatically extends PKG_CONFIG_PATH and LD_LIBRARY_PATH for
          # everything listed here, so node-gyp can find them without manual env exports.
          buildInputs = with pkgs; [
            sword       # CrossWire SWORD library — node-sword-interface links against this
            openssl     # Prisma query engine runtime dependency
          ];

          shellHook = ''
            echo "Scriptorium dev shell"
            echo "  node $(node --version | tr -d '\n')  npm $(npm --version)"

            # Tell node-gyp which Python binary to use so it does not search
            # $PATH (which may find a system Python outside the Nix store).
            export npm_config_python="${pkgs.python3}/bin/python3"
          '';
        };
      }
    );
}
