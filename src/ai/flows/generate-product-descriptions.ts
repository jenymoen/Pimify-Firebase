'use server';

/**
 * @fileOverview Generates product descriptions (short and long) using AI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateProductDescriptionsInputSchema = z.object({
    productName: z.string().describe('The name of the product.'),
    category: z.string().optional().describe('The category of the product.'),
    imageUrls: z.array(z.string()).optional().describe('URLs of product images to analyze.'),
});

export type GenerateProductDescriptionsInput = z.infer<typeof GenerateProductDescriptionsInputSchema>;

const GenerateProductDescriptionsOutputSchema = z.object({
    shortDescription: z.object({
        en: z.string().describe('A compelling short description (1-2 sentences) in English.'),
        no: z.string().describe('A compelling short description (1-2 sentences) translated to Norwegian.'),
    }),
    longDescription: z.object({
        en: z.string().describe('A detailed long description (1-3 paragraphs) in English.'),
        no: z.string().describe('A detailed long description (1-3 paragraphs) translated to Norwegian.'),
    }),
    categories: z.array(z.string()).describe('List of 2-4 suitable product categories (e.g. Electronics, Headphones).'),
    properties: z.array(z.object({
        key: z.string(),
        value: z.string()
    })).describe('List of general product properties (e.g. key: Material, value: Plastic).'),
    technicalSpecs: z.array(z.object({
        key: z.string(),
        value: z.string()
    })).describe('List of technical specifications (e.g. key: Weight, value: 250g).'),
});

export type GenerateProductDescriptionsOutput = z.infer<typeof GenerateProductDescriptionsOutputSchema>;

export async function generateProductDescriptions(
    input: GenerateProductDescriptionsInput
): Promise<GenerateProductDescriptionsOutput> {
    return generateProductDescriptionsFlow(input);
}

const generateProductDescriptionsPrompt = ai.definePrompt({
    name: 'generateProductDescriptionsPrompt',
    input: { schema: GenerateProductDescriptionsInputSchema },
    output: { schema: GenerateProductDescriptionsOutputSchema },
    prompt: `You are an expert copywriter for an e-commerce store. 
Create compelling product descriptions based on the following information.

Product Name: {{{productName}}}
Category: {{{category}}}

{{#if imageUrls}}
The user has provided images of the product. Analyze the images to capture visual details, style, and features.
{{#each imageUrls}}
Image: {{{this}}}
{{/each}}
{{/if}}

Please generate:
1. **Short Description**: A catchy, 1-2 sentence overview suitable for card views. Provide this in both English and Norwegian.
2. **Long Description**: A detailed, 1-3 paragraph description that sells the product, highlights key features, and explains benefits to the customer. Provide this in both English and Norwegian.
3. **Categories**: Suggest 2 to 4 broader product categories this fits into.
4. **Properties**: Suggest general properties (like Material, Fit, Style, Brand origin).
5. **Technical Specs**: Suggest technical specifications (like Dimensions, Weight, Battery Life, Connectivity).

Tone: Professional, persuasive, and descriptive.`,
});

const generateProductDescriptionsFlow = ai.defineFlow(
    {
        name: 'generateProductDescriptionsFlow',
        inputSchema: GenerateProductDescriptionsInputSchema,
        outputSchema: GenerateProductDescriptionsOutputSchema,
    },
    async input => {
        // Genkit usually handles image inputs via specific "media" parts in the prompt structure
        // But standard handlebars template with 'googleai/gemini-2.0-flash' and proper plugin support 
        // often handles URLs if the model and plugin support it directly or via prompt construction.
        // For simplicity with the definePrompt abstraction, we rely on the model's ability to see the URLs.
        // NOTE: If Gemini requires specific 'image' objects, we might need manual message construction
        // but newer Genkit versions simplify this. We will try the prompt template first.

        // Actually, for Gemini multimodal in Genkit, passing URLs in text might process them if they are public,
        // otherwise we might need to fetch and pass base64. 
        // For this implementation, we assume the AI can process the context or we will refine if it fails.

        const { output } = await generateProductDescriptionsPrompt(input);
        return output!;
    }
);
