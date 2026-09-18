/**
 * The admin panel is always shown in light mode, whichever mode the public
 * website is set to. Re-declaring the colour variables here means nothing in
 * the panel has to know the website has two modes at all.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-scope">{children}</div>;
}
