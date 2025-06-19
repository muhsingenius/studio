
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
// import { db } from "@/lib/firebase"; // Firestore imports will be needed later
// import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// Placeholder data - replace with Firestore integration
const sampleProducts: Product[] = [
  { id: "prod1", name: "Graphic Design Service", description: "One hour of graphic design work", unitPrice: 150, createdAt: new Date() },
  { id: "prod2", name: "Web Development Consultation", unitPrice: 250, createdAt: new Date() },
  { id: "prod3", name: "Handcrafted Beaded Necklace", description: "Unique, locally sourced beads", unitPrice: 75, createdAt: new Date() },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Set to true when fetching data
  const { toast } = useToast();

  // useEffect(() => {
  //   setIsLoading(true);
  //   // const productsCollectionRef = collection(db, "products");
  //   // const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
  //   //   const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  //   //   setProducts(productsData);
  //   //   setIsLoading(false);
  //   // }, (error) => {
  //   //   console.error("Error fetching products:", error);
  //   //   toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
  //   //   setIsLoading(false);
  //   // });
  //   // return () => unsubscribe();
  //   // Simulate loading for now
  //   setTimeout(() => setIsLoading(false), 500);
  // }, [toast]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    // setIsFormOpen(true); // Enable when ProductForm component is ready
    toast({ title: "Coming Soon", description: "Adding new products will be available shortly." });
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    // setIsFormOpen(true); // Enable when ProductForm component is ready
    toast({ title: "Coming Soon", description: "Editing products will be available shortly." });
  };

  const handleDeleteProduct = async (productId: string) => {
    // setIsLoading(true);
    // try {
    //   // await deleteDoc(doc(db, "products", productId));
    //   toast({ title: "Product Deleted", description: "Product has been removed.", variant: "destructive" });
    // } catch (error) {
    //   console.error("Error deleting product:", error);
    //   toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    // } finally {
    //   // setIsLoading(false);
    // }
    toast({ title: "Coming Soon", description: "Deleting products will be available shortly." });
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
            <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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

        {isLoading && <LoadingSpinner fullPage />}

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
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} title="Edit Product">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} title="Delete Product">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          {products.length === 0 ? "No products yet. Add your first product!" : "No products match your search."}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Placeholder for ProductForm dialog */}
        {/* <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {isFormOpen && (
            <ProductForm
              product={selectedProduct}
              onSave={handleSaveProduct}
              setOpen={setIsFormOpen}
            />
          )}
        </Dialog> */}

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
