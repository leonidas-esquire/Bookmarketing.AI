
import React from 'react';
import { Tool, User, Book } from '../types';
import { ToolCard } from './ToolCard';

interface DashboardProps {
  setActiveTool: (tool: Tool) => void;
  user: User;
  activeBook: Book;
}

const tools: Tool[] = [
  // Foundational Strategy
  { id: 'book-dna-analyzer', title: 'Book DNA Analyzer', description: 'Perform a deep analysis of your manuscript to define its core identity, audience, and market position.', icon: 'fa-dna' },
  { id: 'campaign-architecture', title: 'Campaign Architecture', description: 'Architect launch plans, long-term roadmaps, and budget strategies based on your Book DNA.', icon: 'fa-sitemap' },
  { id: 'multi-channel-strategy', title: 'Multi-Channel Strategy', description: 'Generate detailed plans for Amazon, social media, email, and influencers.', icon: 'fa-share-alt' },
  { id: 'asset-generation', title: 'Asset Generation', description: 'Create a library of ready-to-use marketing copy, blurbs, ad hooks, and video scripts.', icon: 'fa-file-alt' },

  // Creative Tools
  { id: 'marketing-video-creator', title: 'Marketing Video Creator', description: 'Turn your manuscript into a complete video marketing campaign plan.', icon: 'fa-bullhorn' },
  { id: 'image-editor', title: 'A/B Cover Optimizer', description: 'Edit your cover art and generate variations for data-driven A/B testing on retail sites.', icon: 'fa-chart-pie' },
  { id: 'audiobook-creator', title: 'Multi-Channel Audio AI', description: 'Convert text excerpts into audio for podcasts, social media, and audiobook samples.', icon: 'fa-headphones-alt' },

  // Intelligence & Sales
  { id: 'market-research', title: 'Market Intelligence AI', description: 'Get real-time insights on competitor positioning, market trends, and reader conversations.', icon: 'fa-chart-line' },
  { id: 'cover-analyzer', title: 'Marketability Analyzer', description: 'Get real-time, data-driven feedback on your book cover\'s genre-fit and commercial appeal.', icon: 'fa-search-dollar' },
  { id: 'funnel-builder', title: 'Reader Journey AI', description: 'Architect a complete, psychology-driven sales funnel to guide readers from awareness to purchase.', icon: 'fa-route' },
  { id: 'direct-sales-channel', title: 'Author Sales Platform', description: 'Systematically scale your income by selling your book directly to readers with a high-converting checkout.', icon: 'fa-store' },

  // Distribution & Scaling
  { id: 'website-builder', title: 'Author Hub Builder', description: 'Integrate all your marketing channels into a high-converting, central author website.', icon: 'fa-desktop' },
  { id: 'book-distributor', title: 'Book Distributor', description: 'Generate and send professional ONIX metadata packages to major retailers.', icon: 'fa-rocket' },
  { id: 'audio-transcriber', title: 'Content Scaler AI', description: 'Transcribe spoken ideas into blog posts, social media updates, and newsletters to scale content production.', icon: 'fa-clone' },


  // PR & Outreach
  { id: 'influencer-outreach', title: 'Influencer AI Connect', description: 'Identify and connect with ideal influencers and build partnership strategies to amplify your book\'s reach.', icon: 'fa-handshake', comingSoon: true },
  { id: 'pr-campaign', title: 'Media & PR Strategist', description: 'Develop a comprehensive PR campaign, from media targeting to crafting compelling story angles.', icon: 'fa-newspaper', comingSoon: true },
  { id: 'media-kit-creator', title: 'Press Kit Pro', description: 'Instantly generate a professional press release and a complete media kit for your book launch.', icon: 'fa-briefcase', comingSoon: true },
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
