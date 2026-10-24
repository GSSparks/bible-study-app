{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    python312
    python312Packages.pdfminer-six
    python312Packages.pytesseract
    python312Packages.pdf2image
    poppler-utils   # required by pdf2image for PDF → image conversion
    tesseract       # OCR engine (pytesseract wraps this)
  ];

  shellHook = ''
    echo "Vine's extraction environment ready."
    echo "Usage: python extract.py ../sources/Vines-Part1.pdf --out out/"
  '';
}
