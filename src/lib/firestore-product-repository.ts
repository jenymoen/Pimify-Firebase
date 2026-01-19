import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    DocumentSnapshot,
    QueryConstraint,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ProductsTable } from './database-schema';
import { WorkflowState } from '@/types/workflow';

export class FirestoreProductRepository {
    private collectionName = 'products';

    /**
     * Create or overwrite a product
     */
    async save(product: ProductsTable): Promise<void> {
        const docRef = doc(db, this.collectionName, product.id);
        await setDoc(docRef, product);
    }

    /**
     * Get product by ID
     */
    async getById(id: string): Promise<ProductsTable | null> {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as ProductsTable;
        }
        return null;
    }

    /**
     * Update a product (partial update)
     */
    async update(id: string, data: Partial<ProductsTable>): Promise<void> {
        const docRef = doc(db, this.collectionName, id);
        // Add updated_at if not present
        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };
        await updateDoc(docRef, updateData);
    }

    /**
     * Delete a product
     */
    async delete(id: string): Promise<void> {
        const docRef = doc(db, this.collectionName, id);
        await deleteDoc(docRef);
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
        lastDoc?: DocumentSnapshot;
    }): Promise<{ products: ProductsTable[], lastDoc: DocumentSnapshot | null }> {
        const constraints: QueryConstraint[] = [];
        const productsRef = collection(db, this.collectionName);

        // Apply filters
        if (params.workflowState) {
            constraints.push(where('workflow_state', '==', params.workflowState));
        }

        if (params.assignedReviewerId) {
            constraints.push(where('assigned_reviewer_id', '==', params.assignedReviewerId));
        }

        if (params.status) {
            constraints.push(where('status', '==', params.status));
        }

        // Note: Firestore doesn't support native full-text search. 
        // Ideally use Algolia or Typesense. For now, we do client-side filtering 
        // or simple prefix matching if needed, but extensive search requires dedicated service.
        // We will omit search constraint here and rely on basic filters + ordering.

        // Order by updated_at desc by default
        constraints.push(orderBy('updated_at', 'desc'));

        if (params.limit) {
            constraints.push(limit(params.limit));
        }

        if (params.lastDoc) {
            constraints.push(startAfter(params.lastDoc));
        }

        const q = query(productsRef, ...constraints);
        const snapshot = await getDocs(q);

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
        const q = query(collection(db, this.collectionName));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as ProductsTable);
    }
}

export const firestoreProductRepository = new FirestoreProductRepository();
