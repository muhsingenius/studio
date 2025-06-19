
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import type { Product } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Dialog } from "@/components/ui/dialog"; // Removed DialogTrigger as it's not directly used
import ProductForm from "@/components/products/ProductForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Added for save operation loading
  const [isDeleting, setIsDeleting] = useState(false); // Added for delete operation loading
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const productsCollectionRef = collection(db, "products");
    const q = query(productsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          quantityInStock: data.quantityInStock || 0, // Ensure default if not present
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as Product;
      });
      setProducts(productsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (data: Omit<Product, "id" | "createdAt">) => {
    setIsSaving(true);
    try {
      if (selectedProduct) {
        const productDocRef = doc(db, "products", selectedProduct.id);
        await updateDoc(productDocRef, { ...data });
        toast({ title: "Product Updated", description: `${data.name} has been updated successfully.` });
      } else {
        await addDoc(collection(db, "products"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Product Added", description: `${data.name} has been added successfully.` });
      }
      setIsFormOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error saving product: ", error);
      toast({ title: "Error", description: "Could not save product data to Firestore.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setIsDeleting(true);
    try {
      const productDocRef = doc(db, "products", productId);
      await deleteDoc(productDocRef);
      toast({ title: "Product Deleted", description: "The product has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({ title: "Error", description: "Could not delete product from Firestore.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Products & Services"
          description="Manage your inventory of products and services."
          actions={
            <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Product/Service
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name or description..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && products.length === 0 && <LoadingSpinner fullPage />}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Product List</CardTitle>
            <CardDescription>All available products and services.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Unit Price (GHS)</TableHead>
                    <TableHead className="text-right">Qty in Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.description || "N/A"}</TableCell>
                        <TableCell className="text-right">{product.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{product.quantityInStock}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} title="Edit Product" disabled={isSaving || isDeleting}>
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete Product" disabled={isSaving || isDeleting}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the product "{product.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? <LoadingSpinner size={16} /> : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          {products.length === 0 ? "No products yet. Add your first product!" : "No products match your search."}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
              {isLoading && products.length > 0 && <div className="p-4 text-center"><LoadingSpinner /></div>}
            </div>
          </CardContent>
        </Card>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {isFormOpen && (
            <ProductForm
              product={selectedProduct}
              onSave={handleSaveProduct}
              setOpen={setIsFormOpen}
            />
          )}
        </Dialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
