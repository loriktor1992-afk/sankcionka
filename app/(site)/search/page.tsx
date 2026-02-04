import { Suspense } from 'react';
import SearchContent from './SearchContent';

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10">
      <Suspense fallback={
        <div className="container mx-auto px-4">
          <p className="text-lg text-gray-600">Загрузка...</p>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </main>
  );
}
