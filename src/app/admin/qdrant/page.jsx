import QdrantManager from '../../../components/Admin/QdrantManager';

export const metadata = {
  title: 'PSADT Qdrant Manager',
  description: 'Manage the PSADT Qdrant vector database integration',
};

export default function QdrantManagerPage() {
  return (
    <div>
      <QdrantManager />
    </div>
  );
}
