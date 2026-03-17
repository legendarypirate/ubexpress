"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Delivery, DeliveryHistory, DeliveryStatus, User, Region, DeliveryItem } from '../types/delivery';
import { format } from 'date-fns';
import { fetchDeliveryItems, updateDeliveryItem, deleteDeliveryItem } from '../services/delivery.service';

interface DriverAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  drivers: User[];
  selectedDriverId: number | null;
  onDriverSelect: (driverId: number) => void;
  regions: Region[];
  selectedRegionId: number | null;
  onRegionSelect: (regionId: number | null) => void;
}

export function DriverAllocationModal({
  isOpen,
  onClose,
  onSave,
  drivers,
  selectedDriverId,
  onDriverSelect,
  regions,
  selectedRegionId,
  onRegionSelect,
}: DriverAllocationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жолооч сонгох</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
         
          <div className="space-y-2">
            <Label>Жолооч</Label>
            <Select
              value={selectedDriverId?.toString() || ''}
              onValueChange={(value) => onDriverSelect(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Жолооч сонгох" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Цуцлах
          </Button>
          <Button onClick={onSave}>Хадгалах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  statuses: DeliveryStatus[];
  selectedStatusId: number | null;
  onStatusSelect: (statusId: number) => void;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onSave,
  statuses,
  selectedStatusId,
  onStatusSelect,
}: StatusChangeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Төлөв солих</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={selectedStatusId?.toString() || ''}
            onValueChange={(value) => onStatusSelect(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Төлөв сонгох" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Цуцлах
          </Button>
          <Button onClick={onSave}>Хадгалах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: DeliveryHistory[];
}

export function HistoryModal({ isOpen, onClose, history }: HistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Хүргэлтийн түүх</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Түүх олдсонгүй</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Огноо</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead>Жолооч</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: item.status_name.color,
                          color: 'white',
                        }}
                      >
                        {item.status_name.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.driver
                        ? `${item.driver.username} (${item.driver.phone})`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Хаах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  delivery: Delivery | null;
  formData: { phone: string; address: string; price: string; delivery_date: string };
  onFormDataChange: (data: { phone: string; address: string; price: string; delivery_date: string }) => void;
}

type ItemEditRow = { quantity: number; unitPrice: number; lineTotal: number };

function initItemEditData(
  items: DeliveryItem[],
  totalPrice: number
): Record<number, ItemEditRow> {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const defaultUnit = totalQty > 0 ? totalPrice / totalQty : 0;
  const rec: Record<number, ItemEditRow> = {};
  items.forEach((item) => {
    const q = item.quantity;
    rec[item.id] = {
      quantity: q,
      unitPrice: defaultUnit,
      lineTotal: defaultUnit * q,
    };
  });
  return rec;
}

function sumLineTotals(data: Record<number, ItemEditRow>): number {
  return Object.values(data).reduce((s, row) => s + row.lineTotal, 0);
}

export function EditModal({
  isOpen,
  onClose,
  onSave,
  delivery,
  formData,
  onFormDataChange,
}: EditModalProps) {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editingItemData, setEditingItemData] = useState<Record<number, ItemEditRow>>({});
  // When quantity is reduced: true = return remaining to warehouse (add to good.stock), false = keep with driver
  const [returnToWareByItemId, setReturnToWareByItemId] = useState<Record<number, boolean>>({});

  // Fetch items when drawer opens
  useEffect(() => {
    if (isOpen && delivery) {
      loadItems();
    } else {
      setItems([]);
      setEditingItemData({});
      setReturnToWareByItemId({});
    }
  }, [isOpen, delivery]);

  const loadItems = async () => {
    if (!delivery) return;
    setLoadingItems(true);
    try {
      const fetchedItems = await fetchDeliveryItems(delivery.id);
      setItems(fetchedItems);
      const totalPrice = Number(formData.price) || 0;
      setEditingItemData(initItemEditData(fetchedItems, totalPrice));
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Бараа ачааллахад алдаа гарлаа');
    } finally {
      setLoadingItems(false);
    }
  };

  // Sync sum of line totals into delivery total (Үнэ) when item rows change
  useEffect(() => {
    if (items.length === 0 || Object.keys(editingItemData).length === 0) return;
    const total = sumLineTotals(editingItemData);
    const current = Number(formData.price) || 0;
    if (Math.abs(total - current) > 0.001) {
      onFormDataChange({ ...formData, price: total.toFixed(2) });
    }
  }, [editingItemData]);

  const updateItemRow = (itemId: number, patch: Partial<ItemEditRow>) => {
    setEditingItemData((prev) => {
      const row = prev[itemId];
      if (!row) return prev;
      const next: ItemEditRow = { ...row, ...patch };
      if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
        next.lineTotal = next.quantity * next.unitPrice;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    const q = Math.max(0, quantity);
    updateItemRow(itemId, { quantity: q });
  };

  const handleUnitPriceChange = (itemId: number, value: string) => {
    const unitPrice = parseFloat(value);
    if (isNaN(unitPrice) || unitPrice < 0) return;
    updateItemRow(itemId, { unitPrice });
  };

  const handleLineTotalChange = (itemId: number, value: string) => {
    const lineTotal = parseFloat(value);
    if (isNaN(lineTotal) || lineTotal < 0) return;
    setEditingItemData((prev) => {
      const row = prev[itemId];
      if (!row) return prev;
      const unitPrice = row.quantity > 0 ? lineTotal / row.quantity : 0;
      return { ...prev, [itemId]: { ...row, lineTotal, unitPrice } };
    });
  };

  const handleUpdateItem = async (itemId: number) => {
    if (!delivery) return;
    const row = editingItemData[itemId];
    const item = items.find((i) => i.id === itemId);
    const initialQuantity = item?.quantity ?? 0;
    const newQuantity = row?.quantity ?? initialQuantity;
    if (newQuantity < 0) {
      toast.error('Тоо хэмжээ буруу байна');
      return;
    }

    const quantityReduced = initialQuantity > newQuantity;
    const options = quantityReduced
      ? { return_to_ware: returnToWareByItemId[itemId] ?? true }
      : undefined;

    try {
      await updateDeliveryItem(delivery.id, itemId, newQuantity, options);
      toast.success('Амжилттай шинэчлэгдлээ');
      await loadItems();
      setReturnToWareByItemId((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (error: any) {
      toast.error(error.message || 'Шинэчлэхэд алдаа гарлаа');
    }
  };

  const setReturnToWare = (itemId: number, value: boolean) => {
    setReturnToWareByItemId((prev) => ({ ...prev, [itemId]: value }));
  };

  const isItemDirty = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    const row = editingItemData[itemId];
    if (!item || !row) return false;
    return item.quantity !== row.quantity;
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!delivery) return;
    if (!confirm('Та энэ барааг устгахдаа итгэлтэй байна уу?')) {
      return;
    }

    try {
      await deleteDeliveryItem(delivery.id, itemId);
      toast.success('Амжилттай устгагдлаа');
      await loadItems();
    } catch (error: any) {
      toast.error(error.message || 'Устгахад алдаа гарлаа');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Утас & Хаяг засах</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Утас *</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) =>
                onFormDataChange({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Хаяг *</Label>
            <Input
              id="edit-address"
              value={formData.address}
              onChange={(e) =>
                onFormDataChange({ ...formData, address: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-price">Үнэ *</Label>
            <Input
              id="edit-price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                onFormDataChange({ ...formData, price: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-delivery_date">Хүргэх огноо *</Label>
            <Input
              id="edit-delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) =>
                onFormDataChange({ ...formData, delivery_date: e.target.value })
              }
              required
            />
          </div>

          {/* Items Section */}
          <div className="space-y-2 border-t pt-4">
            <Label>Бараа</Label>
            {loadingItems ? (
              <p className="text-sm text-gray-500">Ачааллаж байна...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">Бараа байхгүй</p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Бараа</TableHead>
                      <TableHead>Тоо хэмжээ</TableHead>
                      <TableHead>Нэгж үнэ</TableHead>
                      <TableHead>Нийт үнэ</TableHead>
                      <TableHead>Үлдэгдэл / Хаяг</TableHead>
                      <TableHead>Үйлдэл</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const row = editingItemData[item.id] ?? {
                        quantity: item.quantity,
                        unitPrice: 0,
                        lineTotal: 0,
                      };
                      const initialQty = item.quantity;
                      const remaining = initialQty > row.quantity ? initialQty - row.quantity : 0;
                      const returnToWare = returnToWareByItemId[item.id] ?? true;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.good?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              className="w-20"
                              value={row.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item.id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-28"
                              value={row.unitPrice === 0 ? '' : row.unitPrice}
                              onChange={(e) =>
                                handleUnitPriceChange(item.id, e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-28"
                              value={row.lineTotal === 0 ? '' : row.lineTotal}
                              onChange={(e) =>
                                handleLineTotalChange(item.id, e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            {remaining > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-700">
                                  Үлдэгдэл: {remaining} ширхэг
                                </p>
                                <Select
                                  value={returnToWare ? 'ware' : 'driver'}
                                  onValueChange={(v) =>
                                    setReturnToWare(item.id, v === 'ware')
                                  }
                                >
                                  <SelectTrigger className="w-full min-w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ware">
                                      Агуулах руу буцаах
                                    </SelectItem>
                                    <SelectItem value="driver">
                                      Жолооч дээр үлдээх
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateItem(item.id)}
                                disabled={!isItemDirty(item.id)}
                              >
                                Хадгалах
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                Устгах
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Цуцлах
          </Button>
          <Button onClick={onSave}>Хадгалах</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface DeliveryDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  deliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
}

export function DeliveryDateModal({
  isOpen,
  onClose,
  onSave,
  deliveryDate,
  onDeliveryDateChange,
}: DeliveryDateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Хүргэх огноо тохируулах</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-delivery_date">Хүргэх огноо *</Label>
            <Input
              id="bulk-delivery_date"
              type="date"
              value={deliveryDate}
              onChange={(e) => onDeliveryDateChange(e.target.value)}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Цуцлах
          </Button>
          <Button onClick={onSave}>Хадгалах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

