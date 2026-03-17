"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import RequestTable from './components/RequestTable';
import RequestForm from './components/RequestForm';
import { EditPhoneModal } from './components/RequestModals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { User } from './types/request';
import {
  fetchUsers,
  createUser,
  updateUserPhone,
  deleteUser,
} from './services/request.service';

export default function RequestPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Хэрэглэгч ачааллахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Жолооч';
    fetchData();
  }, []);

  // Filter users - only show drivers (role_id === 3) and apply search
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.role_id === 3 &&
        user.username.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredUsers(filtered);
    setPagination((prev) => ({
      ...prev,
      total: filtered.length,
    }));
  }, [users, searchText]);

  const currentPageData = filteredUsers.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleCreateUser = async (payload: any) => {
    try {
      await createUser(payload);
      toast.success('Хэрэглэгч амжилттай үүслээ');
      setIsDrawerOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Хэрэглэгч үүсгэхэд алдаа гарлаа');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleEditPhone = async (phone: string) => {
    if (!editingUser) return;
    try {
      await updateUserPhone(editingUser.id, { phone });
      toast.success('Утасны дугаар амжилттай шинэчлэгдлээ');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleDelete = (user: User) => {
    if (!confirm(`Та "${user.username}" хэрэглэгчийг устгахдаа итгэлтэй байна уу?`)) {
      return;
    }
    const deleteUserAsync = async () => {
      try {
        await deleteUser(user.id);
        toast.success(`"${user.username}" хэрэглэгч амжилттай устгагдлаа`);
        fetchData();
      } catch (error: any) {
        toast.error(error.message || 'Устгахад алдаа гарлаа');
      }
    };
    deleteUserAsync();
  };

  return (
    <div className="w-full mt-6 px-4 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Жолооч</h1>
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="text-sm text-gray-600">
          Нийт: {filteredUsers.length} driver(s)
        </div>
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by username..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)}>
          + Хэрэглэгч үүсгэх
        </Button>
      </div>

      <RequestTable
        users={currentPageData}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Нийт: {pagination.total} | Хуудас: {pagination.current} /{' '}
          {Math.ceil(pagination.total / pagination.pageSize) || 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setPagination((prev) => ({ ...prev, current: Math.max(1, prev.current - 1) }))
            }
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
              }))
            }
            disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
          >
            Дараах
          </Button>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) =>
              setPagination((prev) => ({ ...prev, pageSize: parseInt(value), current: 1 }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <RequestForm
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateUser}
      />

      <EditPhoneModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleEditPhone}
        user={editingUser}
      />
    </div>
  );
}
