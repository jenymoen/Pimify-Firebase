import { adminDb } from './firebase-admin';
import { ProductsTable } from './database-schema';
import { WorkflowState } from '@/types/workflow';

export class FirestoreProductRepository {
    private collectionName = 'products';

    /**
     * Create or overwrite a product
     */
    async save(product: ProductsTable): Promise<void> {
        const docRef = adminDb.collection(this.collectionName).doc(product.id);
        await docRef.set(product);
    }

    /**
     * Get product by ID
     */
    async getById(id: string): Promise<ProductsTable | null> {
        const docRef = adminDb.collection(this.collectionName).doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data() as ProductsTable;
        }
        return null;
    }

    /**
     * Update a product (partial update)
     */
    async update(id: string, data: Partial<ProductsTable>): Promise<void> {
        const docRef = adminDb.collection(this.collectionName).doc(id);
        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };
        await docRef.update(updateData);
    }

    /**
     * Delete a product
     */
    async delete(id: string): Promise<void> {
        const docRef = adminDb.collection(this.collectionName).doc(id);
        await docRef.delete();
    }

    /**
     * Query products with filters and pagination
     */
    async query(params: {
        workflowState?: WorkflowState;
        assignedReviewerId?: string;
        status?: string;
        search?: string;
        limit?: number;
        lastDoc?: FirebaseFirestore.DocumentSnapshot;
    }): Promise<{ products: ProductsTable[], lastDoc: FirebaseFirestore.DocumentSnapshot | null }> {
        let queryRef: FirebaseFirestore.Query = adminDb.collection(this.collectionName);

        // Apply filters
        if (params.workflowState) {
            queryRef = queryRef.where('workflow_state', '==', params.workflowState);
        }

        if (params.assignedReviewerId) {
            queryRef = queryRef.where('assigned_reviewer_id', '==', params.assignedReviewerId);
        }

        if (params.status) {
            queryRef = queryRef.where('status', '==', params.status);
        }

        // Order by updated_at desc by default
        queryRef = queryRef.orderBy('updated_at', 'desc');

        if (params.limit) {
            queryRef = queryRef.limit(params.limit);
        }

        if (params.lastDoc) {
            queryRef = queryRef.startAfter(params.lastDoc);
        }

        const snapshot = await queryRef.get();

        const products: ProductsTable[] = [];
        snapshot.forEach((doc) => {
            products.push(doc.data() as ProductsTable);
        });

        return {
            products,
            lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
        };
    }

    /**
     * Get all products (use with caution)
     */
    async getAll(): Promise<ProductsTable[]> {
        const snapshot = await adminDb.collection(this.collectionName).get();
        return snapshot.docs.map(doc => doc.data() as ProductsTable);
    }
}

export const firestoreProductRepository = new FirestoreProductRepository();
