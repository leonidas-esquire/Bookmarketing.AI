
import React from 'react';
import { Tool, User, Book } from '../types';
import { ToolCard } from './ToolCard';

interface DashboardProps {
  setActiveTool: (tool: Tool) => void;
  user: User;
  activeBook: Book;
}

const tools: Tool[] = [
  // Creative & Psychological
  { id: 'image-generator', title: 'Creative Ad Studio', description: 'Generate unique ad creatives, concept art, and social media visuals. Fueling creative innovation.', icon: 'fa-magic' },
  { id: 'copywriter', title: 'Psychological Copy AI', description: 'Generate blurbs, ads, and social posts using proven psychological triggers to maximize engagement.', icon: 'fa-brain' },
  { id: 'video-generator', title: 'Viral Video Generator', description: 'Create short, emotionally engaging video clips optimized for virality on TikTok, Reels, and Shorts.', icon: 'fa-film' },
  { id: 'audiobook-creator', title: 'Multi-Channel Audio AI', description: 'Convert text excerpts into audio for podcasts, social media, and audiobook samples.', icon: 'fa-headphones-alt' },
  
  // Data & Intelligence
  { id: 'market-research', title: 'Market Intelligence AI', description: 'Get real-time insights on competitor positioning, market trends, and reader conversations.', icon: 'fa-chart-line' },
  { id: 'cover-analyzer', title: 'Marketability Analyzer', description: 'Get real-time, data-driven feedback on your book cover\'s genre-fit and commercial appeal.', icon: 'fa-search-dollar' },
  { id: 'image-editor', title: 'A/B Cover Optimizer', description: 'Edit your cover art and generate variations for data-driven A/B testing on retail sites.', icon: 'fa-chart-pie' },
  { id: 'video-analyzer', title: 'Performance Optimizer AI', description: 'Analyze video, ad, and email performance data to receive continuous optimization recommendations.', icon: 'fa-tachometer-alt', comingSoon: true },
  
  // Scaling & Integration
  { id: 'funnel-builder', title: 'Reader Journey AI', description: 'Architect a complete, psychology-driven sales funnel to guide readers from awareness to purchase.', icon: 'fa-sitemap' },
  { id: 'website-builder', title: 'Author Hub Builder', description: 'Integrate all your marketing channels into a high-converting, central author website.', icon: 'fa-desktop' },
  { id: 'direct-sales-channel', title: 'Author Sales Platform', description: 'Systematically scale your income by selling your book directly to readers with a high-converting checkout.', icon: 'fa-store' },
  { id: 'audio-transcriber', title: 'Content Scaler AI', description: 'Transcribe spoken ideas into blog posts, social media updates, and newsletters to scale content production.', icon: 'fa-clone' },
];

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTool, user, activeBook }) => {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome, <span className="text-indigo-400">{user.name.split(' ')[0]}!</span>
        </h2>
        <p className="mt-4 text-lg text-indigo-200 max-w-3xl mx-auto">
          Ready to market <span className="font-bold text-white italic">"{activeBook.title}"</span>? Select a tool to begin.
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
