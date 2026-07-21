type PdfDocumentIconProps = {
  className?: string;
};

export function PdfDocumentIcon({ className = 'module-file-icon module-file-icon-pdf' }: PdfDocumentIconProps) {
  return <span className={className} aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4H30L40 14V42C40 43.1046 39.1046 44 38 44H10C8.89543 44 8 43.1046 8 42V6C8 4.89543 8.89543 4 10 4Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /><path fillRule="evenodd" clipRule="evenodd" d="M18 18H30V25.9917L18.0083 26L18 18Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 18V34" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>;
}
