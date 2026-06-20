import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import fs from 'fs';
import path from 'path';
import GalleryGrid from '@/components/GalleryGrid';

export default function GalleryPage() {
  const dirPath = path.join(process.cwd(), "public", "photos", "engagement");
  let photos: string[] = [];

  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
    photos = files.map(f => `/photos/engagement/${encodeURIComponent(f)}`);
  }

  return (
    <main className="min-h-screen bg-cream text-charcoal py-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 text-olive hover:text-terracotta flex items-center gap-2 transition-colors duration-300">
            <ArrowLeft size={20} />
            <span className="uppercase tracking-widest text-xs hidden md:inline">Back to Home</span>
          </Link>
          <h1 className="text-5xl md:text-6xl text-charcoal">Captured Moments</h1>
          <p className="mt-4 text-olive max-w-2xl mx-auto text-lg">
            A few of our favorite memories as we prepare for our next chapter. We can't wait to share more with you.
          </p>
        </div>
        
        {photos.length === 0 ? (
          <div className="text-center py-24 border border-sage/15 bg-white/50 rounded-sm">
            <p className="font-serif text-xl text-charcoal/60">No photos found in gallery</p>
            <p className="text-xs text-charcoal/40 mt-1 font-sans">Add engagement highlight photos to public/photos/engagement/</p>
          </div>
        ) : (
          <GalleryGrid photos={photos} />
        )}
      </div>
    </main>
  );
}
