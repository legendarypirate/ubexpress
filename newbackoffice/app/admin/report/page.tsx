"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail } from 'lucide-react';
import {
  fetchReportDeliveries,
  fetchReportOrders,
  fetchMerchantsForReport,
  sendMerchantReportEmails,
  Order,
} from './services/report.service';
import { fetchDrivers } from '../delivery/services/delivery.service';
import { Delivery, User } from '../delivery/types/delivery';
import {
  MerchantReportEmailDelivery,
  ReportRow,
  ReportType,
} from './types/report';

interface MerchantUser {
  id: number;
  username: string;
  email?: string;
}

export default function ReportPage() {
  // State
  const [loading, setLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Тайлан';
  }, []);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [reportDeliveriesByMerchantId, setReportDeliveriesByMerchantId] =
    useState<Record<number, Delivery[]>>({});
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<number[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // User info
  const [user, setUser] = useState<any>(null);

  // Filters
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(),
    new Date(),
  ]);
  const [reportType, setReportType] = useState<ReportType>('driver');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const isCustomer = user?.role === 2 || user?.role_id === 2;
  const isMerchantReportView = !isCustomer && reportType !== 'driver';

  // Data
  const [drivers, setDrivers] = useState<User[]>([]);
  const [merchants, setMerchants] = useState<MerchantUser[]>([]);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Load drivers and merchants on mount (only if not customer)
  useEffect(() => {
    if (isCustomer) return;
    
    const loadUsers = async () => {
      try {
        const [driversData, merchantsData] = await Promise.all([
          fetchDrivers().catch(() => []),
          fetchMerchantsForReport().catch(() => []),
        ]);
        setDrivers(driversData);
        setMerchants(merchantsData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, [isCustomer]);

  // Auto-load today's statistics on initial load (wait for user to be loaded)
  useEffect(() => {
    // Only load if user is loaded (or if we're admin, we can load immediately)
    // For merchants (role 2), we need user to be loaded to filter correctly
    if (user !== null) {
      loadReportData();
    }
  }, [user]);

  // Reset selected ID when report type changes
  useEffect(() => {
    setSelectedId(null);
    setSelectedMerchantIds([]);
  }, [reportType]);

  const getDeliveryStatusLabel = (delivery: Delivery): string => {
    if (delivery.status_name?.status) {
      return delivery.status_name.status;
    }
    const status = Number(delivery.status);
    if (status === 5) return 'Хаягаар очсон';
    if (status === 3) return 'Хүргэсэн';
    return '-';
  };

  const toEmailDeliveries = (deliveries: Delivery[]): MerchantReportEmailDelivery[] =>
    [...deliveries]
      .sort((a, b) => {
        const aDate = new Date(a.delivery_date || a.createdAt).getTime();
        const bDate = new Date(b.delivery_date || b.createdAt).getTime();
        return aDate - bDate;
      })
      .map((delivery) => ({
        id: delivery.id,
        date: delivery.delivery_date || delivery.createdAt,
        address: delivery.address,
        phone: delivery.phone,
        status: getDeliveryStatusLabel(delivery),
        price: parseFloat(delivery.price?.toString() || '0'),
        driver: delivery.driver?.username,
      }));

  const buildMerchantDeliveriesMap = (
    groupedStatus3: Record<string, Delivery[]>,
    groupedStatus5: Record<string, Delivery[]>
  ): Record<number, Delivery[]> => {
    const map: Record<number, Delivery[]> = {};
    const groupKeys = new Set([
      ...Object.keys(groupedStatus3),
      ...Object.keys(groupedStatus5),
    ]);

    groupKeys.forEach((key) => {
      const combined = [
        ...(groupedStatus3[key] || []),
        ...(groupedStatus5[key] || []),
      ];
      if (combined.length === 0) return;

      const { merchantId } = resolveMerchantMeta(key, combined[0]);
      if (!merchantId) return;

      map[merchantId] = combined;
    });

    return map;
  };

  const resolveMerchantMeta = (
    groupKey: string,
    sample?: { merchant_id?: number; merchant?: { username?: string } }
  ) => {
    const idFromDelivery = sample?.merchant_id;
    const merchant =
      (idFromDelivery != null
        ? merchants.find((m) => m.id === idFromDelivery)
        : undefined) ??
      merchants.find((m) => m.username === groupKey) ??
      merchants.find((m) => String(m.id) === groupKey);

    return {
      merchantId: merchant?.id ?? idFromDelivery,
      email: merchant?.email ?? '',
    };
  };

  const selectableMerchantIds = reportData
    .filter((row) => row.merchantId)
    .map((row) => row.merchantId as number);

  const allMerchantsSelected =
    selectableMerchantIds.length > 0 &&
    selectableMerchantIds.every((id) => selectedMerchantIds.includes(id));

  const toggleMerchantSelection = (merchantId: number, checked: boolean) => {
    setSelectedMerchantIds((prev) =>
      checked ? [...prev, merchantId] : prev.filter((id) => id !== merchantId)
    );
  };

  const toggleSelectAllMerchants = (checked: boolean) => {
    setSelectedMerchantIds(checked ? [...selectableMerchantIds] : []);
  };

  const loadReportData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      toast.error('Please select a date range');
      return;
    }

    setLoading(true);
    setSelectedMerchantIds([]);
    setReportDeliveriesByMerchantId({});
    try {
      const startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
      const endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');

      const filters: {
        startDate: string;
        endDate: string;
        driverId?: number;
        merchantId?: number;
      } = {
        startDate,
        endDate,
      };

      // If customer (role 2), automatically filter by their merchant ID
      if (isCustomer && user?.id) {
        filters.merchantId = user.id;
      } else {
        // If a specific driver/merchant is selected, filter by it
        if (reportType === 'driver' && selectedId) {
          filters.driverId = selectedId;
        } else if ((reportType === 'now' || reportType === 'later' || reportType === 'merchant') && selectedId) {
          filters.merchantId = selectedId;
        }
      }

      const [deliveries, orders] = await Promise.all([
        fetchReportDeliveries(filters),
        fetchReportOrders(filters)
      ]);

      // Filter to include deliveries with status 3 (delivered) and status 5 (хаягаар очсон)
      const filteredDeliveries = deliveries.filter(
        (d) => d.status === 3 || d.status === '3' || d.status === 5 || d.status === '5'
      );
      
      // Separate status 3 and status 5 deliveries
      const status3Deliveries = filteredDeliveries.filter(
        (d) => d.status === 3 || d.status === '3'
      );
      const status5Deliveries = filteredDeliveries.filter(
        (d) => d.status === 5 || d.status === '5'
      );

      // Filter merchants by зөрүү (difference) based on report type
      // Skip this filtering for customers (role 2) - show all their deliveries
      // For 'merchant' type, show all merchants (sum of now + later)
      let deliveriesToProcess = status3Deliveries;
      let status5DeliveriesToProcess = status5Deliveries;
      if (!isCustomer && (reportType === 'now' || reportType === 'later')) {
        // Group by merchant first to calculate difference (for status 3)
        const merchantGroups: Record<string, Delivery[]> = {};
        status3Deliveries.forEach((delivery) => {
          const key = delivery.merchant?.username || 'Unknown Merchant';
          if (!merchantGroups[key]) {
            merchantGroups[key] = [];
          }
          merchantGroups[key].push(delivery);
        });

        // Filter merchants based on зөрүү (for status 3)
        deliveriesToProcess = [];
        Object.entries(merchantGroups).forEach(([merchantName, merchantDeliveries]) => {
          const totalPrice = merchantDeliveries.reduce(
            (sum, d) => sum + parseFloat(d.price.toString()),
            0
          );
          const pricePerDelivery = merchantDeliveries[0]?.merchant?.report_price || 7000;
          const salary = merchantDeliveries.length * pricePerDelivery;
          const difference = totalPrice - salary;

          // Now: difference >= 0, Later: difference < 0
          // Merchant: show all (no filtering by difference)
          if ((reportType === 'now' && difference >= 0) || 
              (reportType === 'later' && difference < 0)) {
            deliveriesToProcess.push(...merchantDeliveries);
          }
        });
        
        // Also filter status 5 deliveries by the same merchants
        const filteredMerchantNames = new Set(Object.keys(merchantGroups).filter((merchantName) => {
          const merchantDeliveries = merchantGroups[merchantName];
          const totalPrice = merchantDeliveries.reduce(
            (sum, d) => sum + parseFloat(d.price.toString()),
            0
          );
          const pricePerDelivery = merchantDeliveries[0]?.merchant?.report_price || 7000;
          const salary = merchantDeliveries.length * pricePerDelivery;
          const difference = totalPrice - salary;
          return (reportType === 'now' && difference >= 0) || 
                 (reportType === 'later' && difference < 0);
        }));
        
        status5DeliveriesToProcess = status5Deliveries.filter((d) => {
          const merchantName = d.merchant?.username || 'Unknown Merchant';
          return filteredMerchantNames.has(merchantName);
        });
      }
      // For 'merchant' type, use all filtered deliveries (no difference filtering)

      // Group deliveries by driver or merchant
      // For customers, always group by merchant (their own data)
      const typeToUse = isCustomer ? 'now' : reportType;
      const groupedData = groupDeliveriesByType(deliveriesToProcess, typeToUse, isCustomer, user);
      const groupedStatus5Data = groupDeliveriesByType(status5DeliveriesToProcess, typeToUse, isCustomer, user);
      
      // Group orders by driver or merchant (same grouping logic as deliveries)
      const groupedOrders = groupOrdersByType(orders, typeToUse, isCustomer, user);

      // Calculate statistics for each group
      const reportRows: ReportRow[] = Object.entries(groupedData).map(
        ([id, groupDeliveries]) => {
          // All deliveries are already status 3, so deliveredCount equals totalCount
          const deliveredCount = groupDeliveries.length;
          const totalCount = groupDeliveries.length;
          const totalPrice = groupDeliveries.reduce(
            (sum, d) => sum + parseFloat(d.price.toString()),
            0
          );
          
          // Calculate salary: for drivers use 5000, for merchants use their report_price (default 7000)
          const typeToUse = isCustomer ? 'now' : reportType;
          const pricePerDelivery = typeToUse === 'driver' 
            ? 5000 
            : (groupDeliveries[0]?.merchant?.report_price || 7000);
          
          // Get status 5 deliveries for the same group
          const status5GroupDeliveries = groupedStatus5Data[id] || [];
          const status5Count = status5GroupDeliveries.length;
          
          // Calculate base salary from delivered deliveries
          let salary = deliveredCount * pricePerDelivery;
          
          // Add status 5 amounts to salary: 5k for driver, merchant's report_price for merchants
          if (typeToUse === 'driver') {
            salary += status5Count * 5000;
          } else {
            // Use merchant's report_price from status 5 deliveries (same as status 3)
            const status5PricePerDelivery = status5GroupDeliveries.length > 0
              ? (status5GroupDeliveries[0]?.merchant?.report_price || 7000)
              : pricePerDelivery; // Fallback to status 3 price if no status 5 deliveries
            salary += status5Count * status5PricePerDelivery;
          }

          // Get orders with status 3 for the same group
          const groupOrders = groupedOrders[id] || [];
          const orderCount = groupOrders.length;
          
          // Add 5000 to salary for each order with status 3 (for both merchant and driver)
          salary += orderCount * 5000;

          const name =
            typeToUse === 'driver'
              ? groupDeliveries[0]?.driver?.username || 'Unknown'
              : (isCustomer && user?.username ? user.username : groupDeliveries[0]?.merchant?.username || 'Unknown');

          return {
            dateRange: `${startDate} ~ ${endDate}`,
            name,
            ...(typeToUse !== 'driver'
              ? resolveMerchantMeta(id, groupDeliveries[0])
              : {}),
            deliveredDeliveries: deliveredCount,
            totalDeliveries: deliveredCount + status5Count, // Sum of delivered + status5
            totalPrice,
            salary,
            status5Deliveries: status5Count,
            status5MerchantAmount: 0, // Keep for backward compatibility but not used
            status5DriverAmount: 0, // Keep for backward compatibility but not used
            orderCount, // захиалгын тоо
          };
        }
      );
      
      // Also include groups that only have status 5 deliveries
      Object.entries(groupedStatus5Data).forEach(([id, status5GroupDeliveries]) => {
        if (!groupedData[id]) {
          // This group only has status 5 deliveries
          const typeToUse = isCustomer ? 'now' : reportType;
          const name =
            typeToUse === 'driver'
              ? status5GroupDeliveries[0]?.driver?.username || 'Unknown'
              : (isCustomer && user?.username ? user.username : status5GroupDeliveries[0]?.merchant?.username || 'Unknown');
          
          const status5Count = status5GroupDeliveries.length;
          
          // Calculate salary for status 5 only groups: 5k for driver, merchant's report_price for merchants
          let salary = 0;
          if (typeToUse === 'driver') {
            salary = status5Count * 5000;
          } else {
            // Use merchant's report_price (default 7000)
            const status5PricePerDelivery = status5GroupDeliveries.length > 0
              ? (status5GroupDeliveries[0]?.merchant?.report_price || 7000)
              : 7000;
            salary = status5Count * status5PricePerDelivery;
          }
          
          // Get orders with status 3 for the same group
          const groupOrders = groupedOrders[id] || [];
          const orderCount = groupOrders.length;
          
          // Add 5000 to salary for each order with status 3 (for both merchant and driver)
          salary += orderCount * 5000;
          
          reportRows.push({
            dateRange: `${startDate} ~ ${endDate}`,
            name,
            ...(typeToUse !== 'driver'
              ? resolveMerchantMeta(id, status5GroupDeliveries[0])
              : {}),
            deliveredDeliveries: 0,
            totalDeliveries: status5Count, // Sum of delivered (0) + status5
            totalPrice: 0,
            salary,
            status5Deliveries: status5Count,
            status5MerchantAmount: 0, // Keep for backward compatibility but not used
            status5DriverAmount: 0, // Keep for backward compatibility but not used
            orderCount, // захиалгын тоо
          });
        }
      });

      // Also include groups that only have orders (no deliveries)
      Object.entries(groupedOrders).forEach(([id, groupOrders]) => {
        if (!groupedData[id] && !groupedStatus5Data[id]) {
          // This group only has orders
          const typeToUse = isCustomer ? 'now' : reportType;
          const name =
            typeToUse === 'driver'
              ? groupOrders[0]?.driver?.username || 'Unknown'
              : (isCustomer && user?.username ? user.username : groupOrders[0]?.merchant?.username || 'Unknown');
          
          const orderCount = groupOrders.length;
          
          // Calculate salary: 5000 for each order with status 3 (for both merchant and driver)
          const salary = orderCount * 5000;
          
          reportRows.push({
            dateRange: `${startDate} ~ ${endDate}`,
            name,
            ...(typeToUse !== 'driver'
              ? resolveMerchantMeta(id, groupOrders[0])
              : {}),
            deliveredDeliveries: 0,
            totalDeliveries: 0,
            totalPrice: 0,
            salary,
            status5Deliveries: 0,
            status5MerchantAmount: 0,
            status5DriverAmount: 0,
            orderCount, // захиалгын тоо
          });
        }
      });

      setReportData(reportRows);

      const typeForDeliveries = isCustomer ? 'now' : reportType;
      if (typeForDeliveries !== 'driver') {
        setReportDeliveriesByMerchantId(
          buildMerchantDeliveriesMap(groupedData, groupedStatus5Data)
        );
      } else {
        setReportDeliveriesByMerchantId({});
      }
    } catch (error: any) {
      console.error('Error loading report data:', error);
      toast.error(error.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const groupDeliveriesByType = (
    deliveries: Delivery[],
    type: ReportType,
    isCustomer: boolean = false,
    user: any = null
  ): Record<string, Delivery[]> => {
    const grouped: Record<string, Delivery[]> = {};

    deliveries.forEach((delivery) => {
      // Group by username since that's what we have in the Delivery type
      // The API response may include IDs, but we'll use username as the key
      let key: string;
      if (isCustomer) {
        // For merchants (customers), group ALL deliveries into a single group
        // Use a static key to ensure all deliveries are aggregated together
        key = 'merchant_summary';
      } else if (type === 'driver') {
        // Group by driver username, or 'No Driver' if null
        key = delivery.driver?.username || 'No Driver';
      } else {
        key =
          delivery.merchant_id != null
            ? String(delivery.merchant_id)
            : delivery.merchant?.username || 'Unknown Merchant';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(delivery);
    });

    return grouped;
  };

  const groupOrdersByType = (
    orders: Order[],
    type: ReportType,
    isCustomer: boolean = false,
    user: any = null
  ): Record<string, Order[]> => {
    const grouped: Record<string, Order[]> = {};

    orders.forEach((order) => {
      // Group by username (same logic as deliveries)
      let key: string;
      if (isCustomer) {
        // For merchants (customers), group ALL orders into a single group
        key = 'merchant_summary';
      } else if (type === 'driver') {
        // Group by driver username, or 'No Driver' if null
        key = order.driver?.username || 'No Driver';
      } else {
        key =
          order.merchant_id != null
            ? String(order.merchant_id)
            : order.merchant?.username || 'Unknown Merchant';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(order);
    });

    return grouped;
  };

  const handleSubmit = () => {
    loadReportData();
  };

  const handleSendEmails = async () => {
    const selectedRows = reportData.filter(
      (row) => row.merchantId && selectedMerchantIds.includes(row.merchantId)
    );

    if (selectedRows.length === 0) {
      toast.warning('Имэйл илгээх харилцагч сонгоно уу');
      return;
    }

    const missingEmail = selectedRows.filter((row) => !row.email?.trim());
    if (missingEmail.length > 0) {
      toast.error(
        `Имэйл хаяг байхгүй: ${missingEmail.map((r) => r.name).join(', ')}`
      );
      return;
    }

    if (
      !confirm(
        `${selectedRows.length} харилцагчид тайлан имэйлээр илгээх үү?`
      )
    ) {
      return;
    }

    setSendingEmail(true);
    try {
      const result = await sendMerchantReportEmails(
        selectedRows.map((row) => ({
          merchantId: row.merchantId!,
          name: row.name,
          dateRange: row.dateRange,
          deliveredDeliveries: row.deliveredDeliveries,
          totalDeliveries: row.totalDeliveries,
          totalPrice: row.totalPrice,
          salary: row.salary,
          status5Deliveries: row.status5Deliveries,
          orderCount: row.orderCount || 0,
          deliveries: toEmailDeliveries(
            reportDeliveriesByMerchantId[row.merchantId!] || []
          ),
        }))
      );

      const failed = result.results?.filter((r) => !r.success) || [];
      if (failed.length === 0) {
        toast.success(result.message || 'Имэйл амжилттай илгээгдлээ');
        setSelectedMerchantIds([]);
      } else {
        toast.warning(
          `${result.message} Алдаатай: ${failed.map((f) => f.name || f.merchantId).join(', ')}`
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Имэйл илгээхэд алдаа гарлаа');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const totals = reportData.reduce(
    (acc, row) => {
      acc.deliveredDeliveries += row.deliveredDeliveries;
      acc.totalDeliveries += row.totalDeliveries;
      acc.totalPrice += row.totalPrice;
      acc.salary += row.salary;
      acc.difference += row.totalPrice - row.salary;
      acc.status5Deliveries += row.status5Deliveries;
      acc.orderCount += row.orderCount || 0;
      return acc;
    },
    {
      deliveredDeliveries: 0,
      totalDeliveries: 0,
      totalPrice: 0,
      salary: 0,
      difference: 0,
      status5Deliveries: 0,
      orderCount: 0,
    }
  );

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Determine report type to use
    const typeToUse = isCustomer ? 'now' : reportType;

    // Prepare data for Excel
    const headers = ['Огноо'];
    if (!isCustomer) {
      headers.push(typeToUse === 'driver' ? 'Жолооч' : 'Дэлгүүр');
    }
    headers.push('Нийт хүргэлт', 'Хүргэсэн хүргэлт', 'Хаягаар очсон', 'Захиалгын тоо', 'Нийт тооцоо', 'Цалин', 'зөрүү');

    const excelData = [
      // Headers
      headers,
      // Data rows
      ...reportData.map((row) => {
        const rowData: (string | number)[] = [row.dateRange];
        if (!isCustomer) {
          rowData.push(row.name);
        }
        rowData.push(
          row.totalDeliveries,
          row.deliveredDeliveries,
          row.status5Deliveries,
          row.orderCount || 0,
          row.totalPrice,
          row.salary,
          row.totalPrice - row.salary
        );
        return rowData;
      }),
      // Totals row
      (() => {
        const totalsRow: (string | number)[] = ['Нийт'];
        if (!isCustomer) {
          totalsRow.push('');
        }
        totalsRow.push(
          totals.totalDeliveries,
          totals.deliveredDeliveries,
          totals.status5Deliveries,
          totals.orderCount,
          totals.totalPrice,
          totals.salary,
          totals.difference
        );
        return totalsRow;
      })(),
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    const columnWidths = [{ wch: 20 }]; // Огноо
    if (!isCustomer) {
      columnWidths.push({ wch: 20 }); // Жолооч/Дэлгүүр
    }
    columnWidths.push(
      { wch: 15 }, // Нийт хүргэлт
      { wch: 18 }, // Хүргэсэн хүргэлт
      { wch: 18 }, // Хаягаар очсон
      { wch: 18 }, // Захиалгын тоо
      { wch: 15 }, // Нийт тооцоо
      { wch: 15 }, // Цалин
      { wch: 15 }  // зөрүү
    );
    ws['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    // Generate filename with date range
    const startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
    const endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');
    const filename = `Report_${startDate}_${endDate}_${typeToUse}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
    toast.success('Report exported successfully');
  };

  return (
    <div className="w-full mt-6 px-4 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Тайлан</h1>
      </div>

      {/* Filters Row */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dayjs(dateRange[0]).format('YYYY-MM-DD')}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : new Date();
              setDateRange([date, dateRange[1]]);
            }}
            className="w-40"
          />
          <span className="text-gray-500">~</span>
          <Input
            type="date"
            value={dayjs(dateRange[1]).format('YYYY-MM-DD')}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : new Date();
              setDateRange([dateRange[0], date]);
            }}
            className="w-40"
          />
        </div>

        {/* Report Type - Hide for customers (role 2) */}
        {!isCustomer && (
          <Select
            value={reportType}
            onValueChange={(value) => setReportType(value as ReportType)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="now">Now</SelectItem>
              <SelectItem value="later">Later</SelectItem>
              <SelectItem value="merchant">Merchant</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Conditional Select - Driver or Merchant - Hide for customers (role 2) */}
        {!isCustomer && (
          reportType === 'driver' ? (
            <SearchableSelect
              options={[
                { value: 'all', label: 'All Drivers' },
                ...drivers.map((driver) => ({
                  value: driver.id.toString(),
                  label: driver.username,
                })),
              ]}
              value={selectedId?.toString() || 'all'}
              onValueChange={(value) =>
                setSelectedId(value === 'all' ? null : parseInt(value))
              }
              placeholder="Select Driver"
              className="w-48"
            />
          ) : (
            <SearchableSelect
              options={[
                { value: 'all', label: 'All Merchants' },
                ...merchants.map((merchant) => ({
                  value: merchant.id.toString(),
                  label: merchant.username,
                })),
              ]}
              value={selectedId?.toString() || 'all'}
              onValueChange={(value) =>
                setSelectedId(value === 'all' ? null : parseInt(value))
              }
              placeholder="Select Merchant"
              className="w-48"
            />
          )
        )}

        {/* Submit Button */}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </Button>

        {/* Export Button */}
        <Button
          onClick={exportToExcel}
          disabled={loading || reportData.length === 0}
          variant="outline"
        >
          Export to Excel
        </Button>

        {isMerchantReportView && (
          <Button
            onClick={handleSendEmails}
            disabled={
              loading ||
              sendingEmail ||
              selectedMerchantIds.length === 0 ||
              reportData.length === 0
            }
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendingEmail ? 'Илгээж байна...' : 'Имэйл илгээх'}
          </Button>
        )}
      </div>

      {isMerchantReportView && selectedMerchantIds.length > 0 && (
        <p className="text-sm text-gray-600 mb-2">
          {selectedMerchantIds.length} харилцагч сонгогдсон
        </p>
      )}

      {/* Report Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isMerchantReportView && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allMerchantsSelected}
                    onCheckedChange={(checked) =>
                      toggleSelectAllMerchants(checked === true)
                    }
                    disabled={selectableMerchantIds.length === 0}
                    aria-label="Select all merchants"
                  />
                </TableHead>
              )}
              <TableHead>Огноо</TableHead>
              {!isCustomer && (
                <TableHead>
                  {(isCustomer ? 'now' : reportType) === 'driver' ? 'Жолооч' : 'Дэлгүүр'}
                </TableHead>
              )}
              {isMerchantReportView && <TableHead>Имэйл</TableHead>}
              <TableHead>Нийт хүргэлт</TableHead>
              <TableHead>Хүргэсэн хүргэлт</TableHead>
              <TableHead>Хаягаар очсон</TableHead>
              <TableHead>Захиалгын тоо</TableHead>
              <TableHead>Нийт тооцоо</TableHead>
              <TableHead>Цалин</TableHead>
              <TableHead>зөрүү</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={isCustomer ? 8 : isMerchantReportView ? 11 : 9}
                  className="text-center py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isCustomer ? 8 : isMerchantReportView ? 11 : 9}
                  className="text-center py-8 text-gray-500"
                >
                  No data available for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              <>
                {reportData.map((row, index) => (
                  <TableRow key={row.merchantId ?? `${row.name}-${index}`}>
                    {isMerchantReportView && (
                      <TableCell>
                        <Checkbox
                          checked={
                            row.merchantId
                              ? selectedMerchantIds.includes(row.merchantId)
                              : false
                          }
                          onCheckedChange={(checked) => {
                            if (row.merchantId) {
                              toggleMerchantSelection(row.merchantId, checked === true);
                            }
                          }}
                          disabled={!row.merchantId}
                          aria-label={`Select ${row.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>{row.dateRange}</TableCell>
                    {!isCustomer && (
                      <TableCell className="font-medium">{row.name}</TableCell>
                    )}
                    {isMerchantReportView && (
                      <TableCell className="text-sm">{row.email}</TableCell>
                    )}
                    <TableCell>{row.totalDeliveries}</TableCell>
                    <TableCell>{row.deliveredDeliveries}</TableCell>
                    <TableCell>{row.status5Deliveries}</TableCell>
                    <TableCell>{row.orderCount || 0}</TableCell>
                    <TableCell>{formatCurrency(row.totalPrice)} ₮</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(row.salary)} ₮
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(row.totalPrice - row.salary)} ₮
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-gray-50 font-bold">
                  {isMerchantReportView && <TableCell />}
                  <TableCell className="font-bold">Нийт</TableCell>
                  {!isCustomer && <TableCell className="font-bold"></TableCell>}
                  {isMerchantReportView && <TableCell />}
                  <TableCell className="font-bold">{totals.totalDeliveries}</TableCell>
                  <TableCell className="font-bold">{totals.deliveredDeliveries}</TableCell>
                  <TableCell className="font-bold">{totals.status5Deliveries}</TableCell>
                  <TableCell className="font-bold">{totals.orderCount}</TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(totals.totalPrice)} ₮
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(totals.salary)} ₮
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(totals.difference)} ₮
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
