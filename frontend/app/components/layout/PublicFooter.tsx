const footerLinks = [
  { label: "About the company", href: "/#about-company" },
  { label: "About what it is", href: "/#what-it-is" },
  { label: "Why it is", href: "/#why-it-exists" },
  { label: "Contact", href: "/#contact" },
];

export default function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-gray-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            CloudAudit
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Practical AWS cost visibility and optimization for growing teams.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-gray-700 transition-colors hover:text-aws-orange dark:text-gray-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
