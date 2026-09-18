import { ContactsList } from '../ContactsList';

export const metadata = { title: 'Candidate contacts' };

export default async function CandidateContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  return <ContactsList type="candidate" searchParams={await searchParams} />;
}
