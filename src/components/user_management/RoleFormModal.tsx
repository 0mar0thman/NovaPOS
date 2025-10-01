import { useState, useEffect } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Can } from "@/components/Can";

interface Role {
  id?: number;
  name: string;
  permissions: string[];
}

interface RoleFormModalProps {
  role: Role | null;
  onClose: () => void;
  onRoleUpdated: (role: Role) => void;
}

const RoleFormModal = ({ role, onClose, onRoleUpdated }: RoleFormModalProps) => {
  const [form, setForm] = useState({ name: role?.name || "", permissions: role?.permissions || [] });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string[]; permissions?: string[] }>({});
  const { toast } = useToast();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

  const PermissionDeniedAlert = () => (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>غير مصرح</AlertTitle>
      <AlertDescription>ليس لديك صلاحية لإدارة الصلاحيات.</AlertDescription>
    </Alert>
  );

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/permissions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        setPermissions(response.data.permissions); // الاستجابة تحتوي على أسماء الصلاحيات
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل في جلب الصلاحيات",
          variant: "destructive",
          duration: 3000,
        });
      }
    };
    fetchPermissions();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handlePermissionToggle = (permission: string) => {
    setForm({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter((p) => p !== permission)
        : [...form.permissions, permission],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } };
      let response;
      if (role?.id) {
        response = await axios.put(`${API_BASE_URL}/roles/${role.id}`, form, config);
      } else {
        response = await axios.post(`${API_BASE_URL}/roles`, form, config);
      }

      toast({
        title: role?.id ? "تم تعديل الدور" : "تم إنشاء الدور",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });

      onRoleUpdated(response.data.role);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "حدث خطأ أثناء معالجة الطلب",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  return (
    <Can action={role?.id ? "update" : "create"} subject="Role" fallback={<PermissionDeniedAlert />}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700 transition-all duration-300">
        <DialogHeader>
          <DialogTitle className="text-2xl text-blue-600 dark:text-blue-400">
            {role?.id ? "تعديل الدور" : "إنشاء دور جديد"}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {role?.id ? "قم بتعديل اسم الدور أو الصلاحيات." : "أدخل اسم الدور وحدد الصلاحيات."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 dark:text-gray-200">
              اسم الدور
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="أدخل اسم الدور"
              className={`border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${errors.name ? "border-red-500" : ""}`}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name[0]}</p>}
          </div>
          <Can action="manage" subject="Permission" fallback={<PermissionDeniedAlert />}>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200">الصلاحيات</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={form.permissions.includes(permission)}
                      onCheckedChange={() => handlePermissionToggle(permission)}
                    />
                    <Label htmlFor={permission} className="text-gray-700 dark:text-gray-200">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.permissions && <p className="text-red-500 text-sm">{errors.permissions[0]}</p>}
            </div>
          </Can>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 text-white"
            >
              {role?.id ? "حفظ التغييرات" : "إنشاء الدور"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Can>
  );
};

export default RoleFormModal;