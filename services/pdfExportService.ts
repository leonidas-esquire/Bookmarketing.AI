
import jsPDF from 'jspdf';

// Constants for PDF layout and styling
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_START_Y = 28; // The Y position where content starts after the header
const FOOTER_HEIGHT = 15; // Reserve space for the footer
const FONT_SIZES = { title: 26, h1: 20, h2: 16, h3: 13, body: 11, small: 9 };
const PRIMARY_COLOR = '#4F46E5'; // Indigo
const TEXT_COLOR = '#1F2937'; // Dark Gray
const LIGHT_TEXT_COLOR = '#6B7280'; // Medium Gray
const LINE_HEIGHT_RATIO = 1.25;

class PdfBuilder {
    doc: jsPDF;
    cursorY: number;
    plan: any;
    bookTitle: string;
    sectionTitle: string;

    constructor(plan: any, bookTitle: string, sectionTitle: string) {
        this.doc = new jsPDF('p', 'mm', 'a4');
        this.cursorY = MARGIN;
        this.plan = plan;
        this.bookTitle = bookTitle || "Untitled Book";
        this.sectionTitle = sectionTitle;
    }
    
    // Utility to check if a new page is needed before adding content
    checkPageBreak(heightNeeded: number) {
        if (this.cursorY + heightNeeded > PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT) {
            this.doc.addPage();
            this.addHeader();
            this.cursorY = CONTENT_START_Y;
        }
    }

    // Adds a header to the current page
    addHeader() {
        this.doc.setFontSize(FONT_SIZES.small);
        this.doc.setTextColor(LIGHT_TEXT_COLOR);
        this.doc.text('Bookmarketing.AI Plan', MARGIN, 10);
        this.doc.text(this.bookTitle, PAGE_WIDTH - MARGIN, 10, { align: 'right' });
        this.doc.setDrawColor(LIGHT_TEXT_COLOR);
        this.doc.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);
    }
    
    // Adds a title (H1) and moves the cursor
    addH1(text: string) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h1);
        this.doc.setTextColor(PRIMARY_COLOR);

        const lines = this.doc.splitTextToSize(text, MAX_WIDTH);
        const textHeight = lines.length * FONT_SIZES.h1 * 0.35 * LINE_HEIGHT_RATIO;
        
        this.checkPageBreak(textHeight);
        
        this.doc.text(lines, MARGIN, this.cursorY);
        this.cursorY += textHeight + 6; // Add text height and spacing
    }
    
    // Adds a subtitle (H2) and moves the cursor
    addH2(text: string) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h2);
        this.doc.setTextColor(TEXT_COLOR);

        const lines = this.doc.splitTextToSize(text, MAX_WIDTH);
        const textHeight = lines.length * FONT_SIZES.h2 * 0.35 * LINE_HEIGHT_RATIO;
        
        this.checkPageBreak(textHeight);

        this.doc.text(lines, MARGIN, this.cursorY);
        this.cursorY += textHeight + 5; // Add text height and spacing
    }

    // Adds a smaller heading (H3)
    addH3(text: string) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h3);
        this.doc.setTextColor(TEXT_COLOR);

        const lines = this.doc.splitTextToSize(text, MAX_WIDTH);
        const textHeight = lines.length * FONT_SIZES.h3 * 0.35 * LINE_HEIGHT_RATIO;

        this.checkPageBreak(textHeight);
        
        this.doc.text(lines, MARGIN, this.cursorY);
        this.cursorY += textHeight + 4; // Add text height and spacing
    }
    
    // Adds body text, handles line wrapping, and moves the cursor
    addBody(text: string | string[], isList: boolean = false) {
        if (!text) return;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(FONT_SIZES.body);
        this.doc.setTextColor(TEXT_COLOR);
        
        const textArray = Array.isArray(text) ? text : [text];
        
        textArray.forEach(line => {
             const prefix = isList ? '•  ' : '';
             const lines = this.doc.splitTextToSize(prefix + String(line), MAX_WIDTH - (isList ? 5 : 0));
             const heightNeeded = lines.length * FONT_SIZES.body * 0.35 * LINE_HEIGHT_RATIO;
             this.checkPageBreak(heightNeeded);
             this.doc.text(lines, MARGIN + (isList ? 5 : 0), this.cursorY);
             this.cursorY += heightNeeded;
        });

        this.cursorY += 4; // Spacing after paragraph/list
    }

    addMarkdown(text: string) {
        const lines = text.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('# ')) {
                this.addH1(line.substring(2));
            } else if (line.startsWith('## ')) {
                this.addH2(line.substring(3));
            } else if (line.startsWith('### ')) {
                this.addH3(line.substring(4));
            } else if (line.startsWith('- **')) { // Bold list item
                const cleanLine = line.replace(/- \*\*(.*?)\*\*:/, '$1:');
                this.addH3(cleanLine);
            } else if (line.startsWith('- ')) {
                this.addBody(line.substring(2), true);
            } else if (line.trim() !== '') {
                this.addBody(line);
            } else {
                this.cursorY += 4; // empty line space
            }
        });
    }
    
    addTitlePage() {
        this.doc.setFillColor(PRIMARY_COLOR);
        this.doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.title);
        this.doc.setTextColor('#FFFFFF');
        const titleLines = this.doc.splitTextToSize(this.bookTitle, MAX_WIDTH - 20);
        this.doc.text(titleLines, PAGE_WIDTH / 2, 100, { align: 'center' });
        
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(FONT_SIZES.h2);
        this.doc.text(this.sectionTitle, PAGE_WIDTH / 2, 130, { align: 'center' });
        
        this.doc.setFontSize(FONT_SIZES.small);
        this.doc.text(`Generated on: ${new Date().toLocaleDateString()}`, PAGE_WIDTH / 2, 140, { align: 'center' });

        // Branding
        this.doc.setFontSize(FONT_SIZES.body);
        const poweredByText = 'Powered by ';
        const brandText = 'Bookmarketing.AI';
        this.doc.setFont('helvetica', 'normal');
        const poweredByWidth = this.doc.getStringUnitWidth(poweredByText) * FONT_SIZES.body / this.doc.internal.scaleFactor;
        this.doc.setFont('helvetica', 'bold');
        const brandWidth = this.doc.getStringUnitWidth(brandText) * FONT_SIZES.body / this.doc.internal.scaleFactor;
        const totalWidth = poweredByWidth + brandWidth;
        const startX = (PAGE_WIDTH - totalWidth) / 2;

        this.doc.setFont('helvetica', 'normal');
        this.doc.text(poweredByText, startX, PAGE_HEIGHT - 20);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(brandText, startX + poweredByWidth, PAGE_HEIGHT - 20);
    }

    addAnalysis(analysisText: string) {
        this.doc.addPage();
        this.addHeader();
        this.cursorY = CONTENT_START_Y;
        this.addMarkdown(analysisText);
    }
    
     addArchitecture() {
        this.doc.addPage();
        this.addHeader();
        this.cursorY = CONTENT_START_Y;
        const arch = this.plan.step2_campaignArchitecture;
        if (!arch) { this.addBody('No architecture plan available.'); return; }

        this.addH1('Step 2: Campaign Architecture');

        this.addH2('24-Hour Launch Plan');
        arch.launchPlan_24Hour.forEach((item: any) => {
            this.addH3(item.hour);
            this.addBody([`Task: ${item.task}`, `Platform: ${item.platform}`, `Objective: ${item.objective}`]);
        });

        this.addH2('30-Day Momentum Plan');
        arch.momentumPlan_30Day.forEach((item: any) => {
            this.addH3(item.day);
            this.addBody([`Task: ${item.task}`, `Platform: ${item.platform}`, `Objective: ${item.objective}`]);
        });
        
        this.addH2('90-Day Viral Expansion');
        this.addBody(arch.viralPlan_90Day);

        this.addH2('365-Day Million-Reader Roadmap');
        this.addBody(arch.millionReaderRoadmap_365Day);
    }

    addStrategy() {
        this.doc.addPage();
        this.addHeader();
        this.cursorY = CONTENT_START_Y;
        const strat = this.plan.step3_multiChannelCampaigns;
        if (!strat) { this.addBody('No strategy plan available.'); return; }

        this.addH1('Step 3: Multi-Channel Strategy');

        this.addH2('Amazon Optimization');
        this.addH3('Keywords');
        this.addBody(strat.amazonStrategy.keywords.join(', '));
        this.addH3('Categories');
        this.addBody(strat.amazonStrategy.categories, true);
        
        this.addH2('Social Media Strategy');
        strat.socialMediaCampaigns.forEach((sm: any) => {
            this.addH3(`${sm.platform} Strategy`);
            this.addBody(sm.strategy);
        });

        const emails = strat.emailMarketingSequence;
        if (emails && emails.length > 0) {
             this.addH2('Email Nurture Sequence');
             emails.forEach((email: any) => {
                this.addH3(`Day ${email.day}: ${email.subject}`);
                this.addBody(email.body);
            });
        }
    }

    addAssets() {
        this.doc.addPage();
        this.addHeader();
        this.cursorY = CONTENT_START_Y;
        const assets = this.plan.step4_assetGeneration;
        if (!assets) { this.addBody('No asset plan available.'); return; }
        
        this.addH1('Step 4: Asset Generation');

        this.addH2('Book Blurbs');
        this.addH3('Short');
        this.addBody(assets.copyLibrary.bookBlurbs.short);
        this.addH3('Medium');
        this.addBody(assets.copyLibrary.bookBlurbs.medium);
        this.addH3('Long');
        this.addBody(assets.copyLibrary.bookBlurbs.long);
        
        this.addH2('Ad Copy Hooks');
        assets.copyLibrary.adCopyHooks.forEach((cat: any) => {
            this.addH3(cat.angle);
            this.addBody(cat.hooks, true);
        });
        
        this.addH2('Video Trailer Scripts');
        assets.videoTrailerScripts.forEach((script: any) => {
            this.addH3(script.concept);
            this.addBody(script.script);
        });
    }

    addFooters() {
        const pageCount = this.doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(FONT_SIZES.small);
            this.doc.setTextColor(LIGHT_TEXT_COLOR);
            if(i > 1) { // No footer on title page
                this.doc.text('Generated with Bookmarketing.AI', MARGIN, PAGE_HEIGHT - 10);
                this.doc.text(`Page ${i - 1} of ${pageCount - 1}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
            }
        }
    }
    
    build(buildSteps: (() => void)[]) {
        this.addTitlePage();
        buildSteps.forEach(step => step());
        this.addFooters();
        this.doc.save(`BookmarketingAI_${this.sectionTitle.replace(/\s/g, '')}_${this.bookTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    }
}

export const exportAnalysisToPDF = (analysisText: string, bookTitle: string): Promise<void> => {
    return new Promise((resolve) => {
        const builder = new PdfBuilder({}, bookTitle, 'Book DNA Analysis');
        builder.build([() => builder.addAnalysis(analysisText)]);
        resolve();
    });
};

export const exportArchitectureToPDF = (plan: any, bookTitle: string): Promise<void> => {
    return new Promise((resolve) => {
        const builder = new PdfBuilder(plan, bookTitle, 'Campaign Architecture');
        builder.build([() => builder.addArchitecture()]);
        resolve();
    });
};

export const exportStrategyToPDF = (plan: any, bookTitle: string): Promise<void> => {
    return new Promise((resolve) => {
        const builder = new PdfBuilder(plan, bookTitle, 'Multi-Channel Strategy');
        builder.build([() => builder.addStrategy()]);
        resolve();
    });
};

export const exportAssetsToPDF = (plan: any, bookTitle: string): Promise<void> => {
    return new Promise((resolve) => {
        const builder = new PdfBuilder(plan, bookTitle, 'Asset Generation');
        builder.build([() => builder.addAssets()]);
        resolve();
    });
};
