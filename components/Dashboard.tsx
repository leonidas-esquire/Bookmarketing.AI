
import React from 'react';
import { Tool, User } from '../types';
import { ToolCard } from './ToolCard';

interface DashboardProps {
  setActiveTool: (tool: Tool) => void;
  user: User;
}

const tools: Tool[] = [
  { id: 'image-generator', title: 'AI Illustrator', description: 'Generate unique concept art and promotional images from text.', icon: 'fa-paint-brush' },
  { id: 'image-editor', title: 'Cover Art Studio', description: 'Edit your book cover or promo images using simple text commands.', icon: 'fa-wand-magic-sparkles' },
  { id: 'video-generator', title: 'Book Trailer Creator', description: 'Create short, engaging video clips from text or your book cover.', icon: 'fa-film' },
  { id: 'marketing-video-creator', title: 'Marketing Video Creator', description: 'Turn your manuscript into a complete video marketing campaign plan.', icon: 'fa-bullhorn' },
  // FIX: Corrected a typo in the object definition for the Book Distributor tool.
  { id: 'book-distributor', title: 'Book Distributor', description: 'Prepare a distribution kit for major marketing channels.', icon: 'fa-rocket' },
  { id: 'funnel-builder', title: 'Funnel Builder AI', description: 'Generate a complete JSON sales funnel plan from your manuscript.', icon: 'fa-sitemap' },
  { id: 'cover-analyzer', title: 'Cover Feedback AI', description: 'Get AI-powered feedback on your book cover\'s marketability.', icon: 'fa-search-plus' },
  { id: 'copywriter', title: 'Marketing Copywriter', description: 'Generate blurbs, social media posts, and ad copy in seconds.', icon: 'fa-pencil-alt' },
  { id: 'market-research', title: 'Trend Spotter', description: 'Get up-to-date market insights with Google Search grounding.', icon: 'fa-chart-line' },
  { id: 'audience-analyzer', title: 'Audience Analyzer', description: 'Upload your manuscript to identify your ideal reader demographic.', icon: 'fa-users' },
  { id: 'website-builder', title: 'AI Website Builder', description: 'Upload your book\'s PDF to generate a high-converting author website design.', icon: 'fa-desktop' },
  { id: 'audiobook-creator', title: 'Audiobook Sampler', description: 'Convert text excerpts into high-quality audio samples.', icon: 'fa-microphone-alt' },
  { id: 'audio-transcriber', title: 'Author Dictation', description: 'Transcribe your spoken ideas, notes, or chapter drafts.', icon: 'fa-waveform' },
  { id: 'video-analyzer', title: 'Trailer Analyzer', description: 'Analyze videos for key information and emotional impact.', icon: 'fa-video', comingSoon: true },
];

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTool, user }) => {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome, <span className="text-indigo-400">{user.name.split(' ')[0]}!</span>
        </h2>
        <p className="mt-4 text-lg text-indigo-200 max-w-3xl mx-auto">
          Ready to market <span className="font-bold text-white italic">"{user.bookTitle}"</span>? Select a tool to begin.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map(tool => (
          <ToolCard key={tool.id} tool={tool} onSelect={() => setActiveTool(tool)} />
        ))}
      </div>
    </div>
  );
};
