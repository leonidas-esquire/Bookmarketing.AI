import jsPDF from 'jspdf';

// Constants for PDF layout and styling
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_SIZES = { title: 26, h1: 20, h2: 16, h3: 13, body: 11, small: 9 };
const PRIMARY_COLOR = '#4F46E5'; // Indigo
const TEXT_COLOR = '#1F2937'; // Dark Gray
const LIGHT_TEXT_COLOR = '#6B7280'; // Medium Gray
const LINE_HEIGHT_RATIO = 1.25;

class PdfBuilder {
    doc: jsPDF;
    cursorY: number;
    plan: any;

    constructor(plan: any) {
        this.doc = new jsPDF('p', 'mm', 'a4');
        this.cursorY = MARGIN;
        this.plan = plan;
    }
    
    // Utility to check if a new page is needed before adding content
    checkPageBreak(heightNeeded: number) {
        if (this.cursorY + heightNeeded > PAGE_HEIGHT - MARGIN) {
            this.doc.addPage();
            this.cursorY = MARGIN;
            this.addHeader();
        }
    }

    // Adds a header to the current page
    addHeader() {
        this.doc.setFontSize(FONT_SIZES.small);
        this.doc.setTextColor(LIGHT_TEXT_COLOR);
        this.doc.text('Bookmarketing.AI Campaign Plan', MARGIN, 10);
        this.doc.text(this.plan.step1_bookAnalysis?.genreAndPositioning.split(':')[0] ?? 'Marketing Plan', PAGE_WIDTH - MARGIN, 10, { align: 'right' });
        this.doc.setDrawColor(LIGHT_TEXT_COLOR);
        this.doc.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);
    }
    
    // Adds a title (H1) and moves the cursor
    addH1(text: string) {
        this.checkPageBreak(20);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h1);
        this.doc.setTextColor(PRIMARY_COLOR);
        this.doc.text(text, MARGIN, this.cursorY);
        this.cursorY += 12;
    }
    
    // Adds a subtitle (H2) and moves the cursor
    addH2(text: string) {
        this.checkPageBreak(15);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h2);
        this.doc.setTextColor(TEXT_COLOR);
        this.doc.text(text, MARGIN, this.cursorY);
        this.cursorY += 9;
    }

    // Adds a smaller heading (H3)
    addH3(text: string) {
        this.checkPageBreak(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.h3);
        this.doc.setTextColor(TEXT_COLOR);
        this.doc.text(text, MARGIN, this.cursorY);
        this.cursorY += 7;
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
    
    // Main function to build the entire PDF document
    build() {
        this.addTitlePage();
        this.addStep1();
        this.addStep2();
        this.addStep3();
        this.addStep4();
        this.addFooters();
        
        const bookTitle = this.plan?.step1_bookAnalysis?.genreAndPositioning?.match(/"(.*?)"/)?.[1] || "Untitled";
        this.doc.save(`BookmarketingAI_Plan_${bookTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    }

    addTitlePage() {
        const bookTitle = this.plan?.step1_bookAnalysis?.genreAndPositioning?.match(/"(.*?)"/)?.[1] || "Untitled Book";
        this.doc.setFillColor(PRIMARY_COLOR);
        this.doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(FONT_SIZES.title);
        this.doc.setTextColor('#FFFFFF');
        const titleLines = this.doc.splitTextToSize(bookTitle, MAX_WIDTH - 20);
        this.doc.text(titleLines, PAGE_WIDTH / 2, 100, { align: 'center' });
        
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(FONT_SIZES.h2);
        this.doc.text('Marketing & Campaign Plan', PAGE_WIDTH / 2, 130, { align: 'center' });
        
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

    addStep1() {
        this.doc.addPage();
        this.cursorY = MARGIN;
        this.addHeader();
        this.addH1('Step 1: Comprehensive Book Analysis');

        this.addH2('Genre & Market Positioning');
        this.addBody(this.plan.step1_bookAnalysis.genreAndPositioning);

        this.addH2('Unique Selling Proposition');
        this.addBody(`"${this.plan.step1_bookAnalysis.uniqueSellingProposition}"`);
        
        this.addH2('Target Audience: A Day in the Life');
        this.addBody(this.plan.step1_bookAnalysis.targetAudienceProfile.dayInTheLife);
        
        this.addH2('Competitive Analysis');
        this.plan.step1_bookAnalysis.competitiveAnalysis.forEach((comp: any) => {
            this.addH3(`${comp.title} by ${comp.author}`);
            this.addBody(`Differentiation: ${comp.differentiation}`);
        });

        this.addH2('Commercial Potential');
        this.addBody(this.plan.step1_bookAnalysis.commercialPotential);
    }
    
     addStep2() {
        this.doc.addPage();
        this.cursorY = MARGIN;
        this.addHeader();
        this.addH1('Step 2: Campaign Architecture');

        this.addH2('24-Hour Launch Plan');
        this.plan.step2_campaignArchitecture.launchPlan_24Hour.forEach((item: any) => {
            this.addBody(`[${item.hour}] ${item.action}: ${item.details}`);
        });

        this.addH2('30-Day Momentum Plan');
        this.plan.step2_campaignArchitecture.momentumPlan_30Day.forEach((item: any) => {
            this.addBody(`[${item.day}] ${item.action}: ${item.details}`);
        });
        
        this.addH2('90-Day Viral Expansion');
        this.addBody(this.plan.step2_campaignArchitecture.viralPlan_90Day);

        this.addH2('365-Day Million-Reader Roadmap');
        this.addBody(this.plan.step2_campaignArchitecture.millionReaderRoadmap_365Day);
    }

    addStep3() {
        this.doc.addPage();
        this.cursorY = MARGIN;
        this.addHeader();
        this.addH1('Step 3: Multi-Channel Strategy');

        this.addH2('Amazon Optimization');
        this.addH3('Keywords');
        this.addBody(this.plan.step3_multiChannelCampaigns.amazonStrategy.keywords.join(', '));
        this.addH3('Categories');
        this.addBody(this.plan.step3_multiChannelCampaigns.amazonStrategy.categories, true);
        
        this.addH2('Social Media Strategy');
        this.plan.step3_multiChannelCampaigns.socialMediaCampaigns.forEach((sm: any) => {
            this.addH3(`${sm.platform} Strategy`);
            this.addBody(sm.strategy);
        });

        this.addH2('Email Nurture Sequence');
         this.plan.step3_multiChannelCampaigns.emailMarketingSequence.forEach((email: any) => {
            this.addH3(`Day ${email.day}: ${email.subject}`);
            this.addBody(email.body);
        });
    }

    addStep4() {
        this.doc.addPage();
        this.cursorY = MARGIN;
        this.addHeader();
        this.addH1('Step 4: Asset Generation');

        this.addH2('Book Blurbs');
        this.addH3('Short');
        this.addBody(this.plan.step4_assetGeneration.copyLibrary.bookBlurbs.short);
        this.addH3('Medium');
        this.addBody(this.plan.step4_assetGeneration.copyLibrary.bookBlurbs.medium);
        this.addH3('Long');
        this.addBody(this.plan.step4_assetGeneration.copyLibrary.bookBlurbs.long);
        
        this.addH2('Ad Copy Hooks');
        this.plan.step4_assetGeneration.copyLibrary.adCopyHooks.forEach((cat: any) => {
            this.addH3(cat.angle);
            this.addBody(cat.hooks, true);
        });
        
        this.addH2('Video Trailer Scripts');
        this.plan.step4_assetGeneration.videoTrailerScripts.forEach((script: any) => {
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
                this.doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
            }
        }
    }
}

// The main function exported to be used in the component
export const exportCampaignToPDF = (plan: any): Promise<void> => {
    return new Promise((resolve) => {
        const builder = new PdfBuilder(plan);
        builder.build();
        resolve();
    });
};
