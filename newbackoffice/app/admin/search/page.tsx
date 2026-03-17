"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { toast } from 'sonner';
import DeliveryTable from '../delivery/components/DeliveryTable';
import {
  DriverAllocationModal,
  StatusChangeModal,
  HistoryModal,
  EditModal,
  DeliveryDateModal,
} from '../delivery/components/DeliveryModals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Delivery,
  DeliveryItem,
  DeliveryHistory,
  DeliveryStatus,
  User,
  DeliveryFilters as Filters,
  Region,
} from '../delivery/types/delivery';
import {
  fetchDeliveries,
  fetchDeliveryItems,
  fetchDeliveryHistory,
  updateDelivery,
  deleteDeliveries,
  allocateDeliveries,
  changeDeliveryStatus,
  updateDeliveryDates,
  fetchMerchants,
  fetchDrivers,
  fetchStatuses,
  fetchRegions,
} from '../delivery/services/delivery.service';
import { formatDateLocal, getTodayLocal } from '@/lib/utils';

function SearchPageContent() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [phoneFilter, setPhoneFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState<number | null>(null);
  const [driverFilter, setDriverFilter] = useState<number | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeliveryDateModalOpen, setIsDeliveryDateModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [bulkDeliveryDate, setBulkDeliveryDate] = useState('');
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [editFormData, setEditFormData] = useState({ phone: '', address: '', price: '', delivery_date: '' });

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<number, DeliveryItem[] | null>>({});
  const [loadingRows, setLoadingRows] = useState<number[]>([]);

  const [merchants, setMerchants] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [statusList, setStatusList] = useState<DeliveryStatus[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'Хайх';
    const storedPermissions = typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
    if (storedPermissions) setPermissions(JSON.parse(storedPermissions));
    const loadData = async () => {
      try {
        const [merchantsData, driversData, statusesData, regionsData] = await Promise.all([
          fetchMerchants().catch(() => []),
          fetchDrivers().catch(() => []),
          fetchStatuses().catch(() => []),
          fetchRegions().catch(() => []),
        ]);
        setMerchants(merchantsData);
        setDrivers(driversData);
        setStatusList(statusesData);
        setRegions(regionsData);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadDeliveries = async () => {
      setLoading(true);
      try {
        const filters: Filters = {
          phone: phoneFilter || undefined,
          merchantId: merchantFilter || undefined,
          driverId: driverFilter || undefined,
          // No startDate/endDate - search all time
        };
        const result = await fetchDeliveries(filters, pagination);
        setDeliveries(result.data);
        setPagination((prev) => ({ ...prev, total: result.pagination.total }));
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        toast.error('Хайлт ачааллахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };
    loadDeliveries();
  }, [
    pagination.current,
    pagination.pageSize,
    phoneFilter,
    merchantFilter,
    driverFilter,
    refreshTrigger,
  ]);

  const handleExpand = async (expanded: boolean, record: Delivery) => {
    if (expanded) {
      setExpandedRowKeys([record.id]);
      if (!expandedItems[record.id]) {
        setLoadingRows((prev) => [...prev, record.id]);
        try {
          const items = await fetchDeliveryItems(record.id);
          setExpandedItems((prev) => ({ ...prev, [record.id]: items }));
        } catch (error) {
          console.error('Error fetching items:', error);
        } finally {
          setLoadingRows((prev) => prev.filter((id) => id !== record.id));
        }
      }
    } else {
      setExpandedRowKeys([]);
    }
  };

  const handleEdit = async () => {
    if (!selectedDelivery) return;
    try {
      await updateDelivery(selectedDelivery.id, {
        phone: editFormData.phone,
        address: editFormData.address,
        price: editFormData.price === '' ? 0 : Number(editFormData.price),
        delivery_date: editFormData.delivery_date || undefined,
      });
      toast.success('Амжилттай шинэчлэгдлээ');
      setIsEditModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error('Шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleDelete = async () => {
    const nonDeletable = deliveries.filter(
      (d) => selectedRowKeys.includes(d.id) && d.status !== 1
    );
    if (nonDeletable.length > 0) {
      toast.warning('Устгах боломжгүй хүргэлт байна.');
      return;
    }
    try {
      await deleteDeliveries(selectedRowKeys);
      toast.success('Амжилттай устгагдлаа');
      setSelectedRowKeys([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error('Устгахад алдаа гарлаа');
    }
  };

  const handleSaveAllocation = async () => {
    if (!selectedDriverId) {
      toast.warning('Жолооч сонгоно уу!');
      return;
    }
    try {
      await allocateDeliveries(selectedDriverId, selectedRowKeys);
      toast.success('Амжилттай хуваарилагдлаа');
      setIsDriverModalOpen(false);
      setSelectedDriverId(null);
      setSelectedRowKeys([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error('Хуваарилахад алдаа гарлаа');
    }
  };

  const handleSaveStatusChange = async () => {
    if (!selectedStatusId) {
      toast.warning('Төлөв сонгоно уу!');
      return;
    }
    try {
      await changeDeliveryStatus(selectedStatusId, selectedRowKeys);
      toast.success('Амжилттай өөрчлөгдлөө');
      setIsStatusModalOpen(false);
      setSelectedStatusId(null);
      setSelectedRowKeys([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error('Төлөв өөрчлөхөд алдаа гарлаа');
    }
  };

  const handleSaveDeliveryDate = async () => {
    if (!bulkDeliveryDate) {
      toast.warning('Огноо сонгоно уу!');
      return;
    }
    try {
      await updateDeliveryDates(bulkDeliveryDate, selectedRowKeys);
      toast.success('Амжилттай өөрчлөгдлөө');
      setIsDeliveryDateModalOpen(false);
      setBulkDeliveryDate('');
      setSelectedRowKeys([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error('Огноо өөрчлөхөд алдаа гарлаа');
    }
  };

  const handleViewHistory = async (deliveryId: number) => {
    try {
      const history = await fetchDeliveryHistory(deliveryId);
      setDeliveryHistory(history);
      setIsHistoryModalOpen(true);
    } catch (error) {
      toast.error('Түүх ачааллахад алдаа гарлаа');
    }
  };

  const handleEditClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    const deliveryDate = delivery.delivery_date
      ? formatDateLocal(new Date(delivery.delivery_date))
      : getTodayLocal();
    setEditFormData({
      phone: delivery.phone,
      address: delivery.address,
      price: delivery.price.toString(),
      delivery_date: deliveryDate,
    });
    setIsEditModalOpen(true);
  };

  const hasPermission = (perm: string) => permissions.includes(perm);

  return (
    <div className="w-full mt-6 px-4 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Хайх</h1>
        <p className="text-muted-foreground mt-1">
          Утас, дэлгүүр, жолоочноор хайна. Огнооны хязгаарлалтгүй.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Input
          placeholder="Утасаар хайх"
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          className="w-48"
        />
        <Select
          value={merchantFilter?.toString() || 'all'}
          onValueChange={(v) => setMerchantFilter(v === 'all' ? null : parseInt(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Дэлгүүр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүгд</SelectItem>
            {merchants.map((m) => (
              <SelectItem key={m.id} value={m.id.toString()}>
                {m.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={driverFilter?.toString() || 'all'}
          onValueChange={(v) => setDriverFilter(v === 'all' ? null : parseInt(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Жолооч" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүгд</SelectItem>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DeliveryTable
        deliveries={deliveries}
        loading={loading}
        selectedRowKeys={selectedRowKeys}
        onRowSelect={setSelectedRowKeys}
        onEdit={handleEditClick}
        onViewHistory={handleViewHistory}
        expandedRowKeys={expandedRowKeys}
        expandedItems={expandedItems}
        loadingRows={loadingRows}
        onExpand={handleExpand}
      />

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Нийт: {pagination.total} | Хуудас: {pagination.current} /{' '}
          {Math.ceil(pagination.total / pagination.pageSize) || 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination((prev) => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
            disabled={pagination.current === 1}
          >
            Өмнөх
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                current: Math.min(
                  Math.ceil(pagination.total / pagination.pageSize) || 1,
                  prev.current + 1
                ),
              })
            )}
            disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
          >
            Дараах
          </Button>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(v) => setPagination((prev) => ({ ...prev, pageSize: parseInt(v), current: 1 }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRowKeys.length > 0 && hasPermission('delivery:view_delivery') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="text-sm text-gray-600">
              {selectedRowKeys.length} ширхэг сонгогдсон
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsDriverModalOpen(true)}>Жолоочод хуваарилах</Button>
              <Button variant="destructive" onClick={handleDelete}>
                Устгах
              </Button>
              <Button onClick={() => setIsStatusModalOpen(true)}>Төлөв солих</Button>
              <Button
                onClick={() => {
                  setBulkDeliveryDate(getTodayLocal());
                  setIsDeliveryDateModalOpen(true);
                }}
              >
                Хүргэх огноо тохируулах
              </Button>
            </div>
          </div>
        </div>
      )}

      <DriverAllocationModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setSelectedDriverId(null);
          setSelectedRegionId(null);
        }}
        onSave={handleSaveAllocation}
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        onDriverSelect={setSelectedDriverId}
        regions={regions}
        selectedRegionId={selectedRegionId}
        onRegionSelect={setSelectedRegionId}
      />
      <StatusChangeModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedStatusId(null);
        }}
        onSave={handleSaveStatusChange}
        statuses={statusList}
        selectedStatusId={selectedStatusId}
        onStatusSelect={setSelectedStatusId}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={deliveryHistory}
      />
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDelivery(null);
        }}
        onSave={handleEdit}
        delivery={selectedDelivery}
        formData={editFormData}
        onFormDataChange={setEditFormData}
      />
      <DeliveryDateModal
        isOpen={isDeliveryDateModalOpen}
        onClose={() => {
          setIsDeliveryDateModalOpen(false);
          setBulkDeliveryDate('');
        }}
        onSave={handleSaveDeliveryDate}
        deliveryDate={bulkDeliveryDate}
        onDeliveryDateChange={setBulkDeliveryDate}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="w-full mt-6 px-4 pb-32">Ачааллаж байна...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
