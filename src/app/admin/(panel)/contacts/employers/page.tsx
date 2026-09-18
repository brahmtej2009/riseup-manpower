import { ContactsList } from '../ContactsList';

export const metadata = { title: 'Employer contacts' };

export default async function EmployerContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  return <ContactsList type="employer" searchParams={await searchParams} />;
}
