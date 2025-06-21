
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Search, Package as ItemIcon } from "lucide-react";
import type { Item, ItemCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Dialog } from "@/components/ui/dialog";
import ItemForm from "@/components/items/ItemForm";
import { Badge } from "@/components/ui/badge";
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
  Timestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.businessId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch Items
    const itemsCollectionRef = collection(db, "items");
    const itemsQuery = query(
      itemsCollectionRef,
      where("businessId", "==", currentUser.businessId),
      orderBy("createdAt", "desc")
    );
    const unsubscribeItems = onSnapshot(itemsQuery, (querySnapshot) => {
      const itemsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate() : undefined,
        } as Item;
      });
      setItems(itemsData);
      if (isLoading) setIsLoading(false); // Set loading to false after first fetch
    }, (error) => {
      console.error("Error fetching items: ", error);
      toast({ title: "Error", description: "Could not fetch items.", variant: "destructive" });
      setIsLoading(false);
    });

    // Fetch Categories
    const categoriesCollectionRef = collection(db, "itemCategories");
    const categoriesQuery = query(
        categoriesCollectionRef,
        where("businessId", "==", currentUser.businessId),
        orderBy("name", "asc")
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (querySnapshot) => {
        const categoriesData = querySnapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
        } as ItemCategory));
        setCategories(categoriesData);
    }, (error) => {
        console.error("Error fetching categories: ", error);
        toast({ title: "Error", description: "Could not fetch item categories.", variant: "destructive" });
    });


    return () => {
        unsubscribeItems();
        unsubscribeCategories();
    };
  }, [currentUser, toast]);

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = async (data: Omit<Item, "id" | "createdAt" | "updatedAt">) => {
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context is missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const dataToSave: any = { ...data, businessId: currentUser.businessId };

    // Clean up optional fields
    Object.keys(dataToSave).forEach(key => {
        const typedKey = key as keyof typeof dataToSave;
        if (dataToSave[typedKey] === "" || dataToSave[typedKey] === undefined) {
            delete dataToSave[typedKey];
        }
    });

    try {
      if (selectedItem) {
        const itemDocRef = doc(db, "items", selectedItem.id);
        await updateDoc(itemDocRef, { ...dataToSave, updatedAt: serverTimestamp() });
        toast({ title: "Item Updated", description: `${data.name} has been updated successfully.` });
      } else {
        await addDoc(collection(db, "items"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Item Added", description: `${data.name} has been added successfully.` });
      }
      setIsFormOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error saving item: ", error);
      toast({ title: "Error", description: "Could not save item data to Firestore.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setIsDeleting(true);
    try {
      const itemDocRef = doc(db, "items", itemId);
      await deleteDoc(itemDocRef);
      toast({ title: "Item Deleted", description: "The item has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting item: ", error);
      toast({ title: "Error", description: "Could not delete item from Firestore.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Items & Services"
          description="Manage your inventory of items and services."
          actions={
            <Button onClick={handleAddItem} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Item/Service
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items by name, SKU, or description..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && items.length === 0 && <LoadingSpinner fullPage />}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Item List</CardTitle>
            <CardDescription>All available items and services.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Selling Price (GHS)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const categoryName = item.categoryId ? categories.find(c => c.id === item.categoryId)?.name : "N/A";
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{categoryName}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{item.type}</Badge></TableCell>
                          <TableCell>{item.sku || "N/A"}</TableCell>
                          <TableCell className="text-right">{item.sellingPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} title="Edit Item" disabled={isSaving || isDeleting}>
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete Item" disabled={isSaving || isDeleting}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the item "{item.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id)}
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
                      )
                    })
                  ) : (
                    !isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          {items.length === 0 ? "No items yet. Add your first item!" : "No items match your search."}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
              {isLoading && items.length > 0 && <div className="p-4 text-center"><LoadingSpinner /></div>}
            </div>
          </CardContent>
        </Card>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {isFormOpen && (
            <ItemForm
              item={selectedItem}
              categories={categories}
              onSave={handleSaveItem}
              setOpen={setIsFormOpen}
              isSaving={isSaving}
            />
          )}
        </Dialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
