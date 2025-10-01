import { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Can } from "@/components/Can";
import { AbilityContext } from "@/config/ability";
import { User } from "./user";
import { Loader2, Trash2, Plus, Save, UserPlus, X, Check, Shield, ShieldOff } from "lucide-react";
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";

interface Role {
  id: number;
  name: string;
}

interface UserRoleManagerProps {
  user: User;
  roles: Role[];
  onUserUpdated: (user: User) => void;
  disabled: boolean;
  currentLoggedUser: User | null; // المستخدم الحالي المسجل
}

const UserRoleManager = ({ user, roles, onUserUpdated, disabled, currentLoggedUser }: UserRoleManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const { toast } = useToast();
  const ability = useContext(AbilityContext);

  // Check if user is the current logged-in user
  const isCurrentUser = () => {
    return currentLoggedUser && user.id === currentLoggedUser.id;
  };

  // Check if user has admin role
  const hasAdminRole = () => {
    return user.roles?.includes("admin") || false;
  };

  // Initialize user permissions
  useEffect(() => {
    setSelectedPermissions(user.permissions || []);
    setPendingPermissions(user.permissions || []);
  }, [user.permissions]);

  // Fetch available permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!ability.can("manage", "All")) {
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحية لإدارة الصلاحيات.",
          variant: "destructive",
          duration: 3000,
        });
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        await api.get("/sanctum/csrf-cookie");
        const permissionsResponse = await api.get("/api/permissions");
        setPermissions(permissionsResponse.data.permissions);
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل في جلب الصلاحيات",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isOpen && (ability.can("manage", "Role") || ability.can("manage", "Permission"))) {
      fetchPermissions();
    }
  }, [isOpen, toast, ability]);

  // Assign a role to the user
  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار دور",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const selectedRole = roles.find((r) => r.id === parseInt(selectedRoleId));
    if (selectedRole?.name.toLowerCase() === "admin" && !ability.can("manage", "All")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لتعيين دور admin.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoadingAction(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      const response = await api.post(`/api/users/${user.id}/roles`, { role_id: parseInt(selectedRoleId) });
      onUserUpdated(response.data.user);
      toast({
        title: "تم تعيين الدور",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });
      setSelectedRoleId("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في تعيين الدور",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Remove a role from the user
  const handleRemoveRole = async (role: string) => {
    // منع إزالة دور admin من أي مستخدم
    if (role.toLowerCase() === "admin") {
      toast({
        title: "غير مسموح",
        description: "لا يمكن إزالة دور admin من أي مستخدم.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // منع المستخدم الحالي من إزالة آخر دور له
    if (isCurrentUser() && user.roles && user.roles.length <= 1) {
      toast({
        title: "غير مسموح",
        description: "لا يمكن إزالة آخر دور من حسابك الخاص.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoadingAction(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      const roleObj = roles.find((r) => r.name === role);
      if (!roleObj) throw new Error("الدور غير موجود");
      const response = await api.delete(`/api/users/${user.id}/roles/${roleObj.id}`);
      onUserUpdated(response.data.user);
      toast({
        title: "تم إزالة الدور",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في إزالة الدور",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Toggle permission selection
  const handlePermissionToggle = (permission: string) => {
    setPendingPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  // Select or deselect all permissions
  const handleSelectDeselectAll = () => {
    if (pendingPermissions.length === permissions.length) {
      setPendingPermissions([]);
    } else {
      setPendingPermissions([...permissions]);
    }
  };

  // Update user permissions
  const handleUpdatePermissions = async () => {
    setIsLoadingAction(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      const permissionsToAdd = pendingPermissions.filter((p) => !selectedPermissions.includes(p));
      const permissionsToRemove = selectedPermissions.filter((p) => !pendingPermissions.includes(p));

      const promises = [
        ...permissionsToAdd.map((permission) => api.post(`/api/users/${user.id}/permissions`, { permission })),
        ...permissionsToRemove.map((permission) => api.delete(`/api/users/${user.id}/permissions/${permission}`)),
      ];

      const responses = await Promise.all(promises);
      setSelectedPermissions(pendingPermissions);
      const lastResponse = responses[responses.length - 1];
      if (lastResponse?.data?.user) {
        onUserUpdated(lastResponse.data.user);
      }

      toast({
        title: "تم تحديث الصلاحيات",
        description: "تم تحديث صلاحيات المستخدم بنجاح",
        variant: "default",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في تحديث الصلاحيات",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Toggle new role permission selection
  const handleNewRolePermissionToggle = (permission: string) => {
    setNewRolePermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  // Select or deselect all new role permissions
  const handleSelectDeselectAllNewRole = () => {
    if (newRolePermissions.length === permissions.length) {
      setNewRolePermissions([]);
    } else {
      setNewRolePermissions([...permissions]);
    }
  };

  // Create a new role
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الدور",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (newRoleName.toLowerCase().includes("admin") && !ability.can("manage", "All")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لإنشاء دور يحتوي على كلمة 'admin'.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoadingAction(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      const response = await api.post("/api/roles", {
        name: newRoleName,
        permissions: newRolePermissions,
      });

      toast({
        title: "تم إنشاء الدور",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });

      // إضافة الدور الجديد إلى القائمة
      roles.push(response.data.role);
      setNewRoleName("");
      setNewRolePermissions([]);
      setIsCreateRoleDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في إنشاء الدور",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Permission denied alert component
  const PermissionDeniedAlert = ({ subject }: { subject: string }) => (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>غير مصرح</AlertTitle>
      <AlertDescription>ليس لديك صلاحية ل{subject}.</AlertDescription>
    </Alert>
  );

  return (
    <Can action="manage" subject="Role" fallback={<PermissionDeniedAlert subject="إدارة الأدوار والصلاحيات" />}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-100 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors duration-200"
            disabled={disabled}
          >
            <UserPlus className="w-4 h-4" />
            إدارة الأدوار والصلاحيات
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1100px] max-h-[95dvh] overflow-y-auto bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700">
          {isLoadingData || isLoadingAction ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-blue-600 dark:text-blue-400">
                  إدارة أدوار وصلاحيات {user.name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  قم بتعيين أو إزالة الأدوار والصلاحيات لهذا المستخدم.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                  <Can action="manage" subject="All" fallback={<PermissionDeniedAlert subject="إدارة الأدوار" />}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">إدارة الأدوار</h3>
                      <Button
                        size="sm"
                        onClick={() => setIsCreateRoleDialogOpen(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        إنشاء دور جديد
                      </Button>
                    </div>
                  </Can>

                  <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
                    <DialogContent className="sm:max-w-[800px] max-h-[95dvh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>إنشاء دور جديد</DialogTitle>
                        <DialogDescription>أدخل اسم الدور الجديد واختر الصلاحيات المرتبطة به</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="roleName">اسم الدور</Label>
                          <Input
                            id="roleName"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="مثال: مدير النظام"
                            className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <Can action="manage" subject="All" fallback={<PermissionDeniedAlert subject="إدارة الأدوار" />}>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-gray-700 dark:text-gray-200 block">الصلاحيات للدور الجديد</Label>
                              <Button
                                onClick={handleSelectDeselectAllNewRole}
                                variant="outline"
                                className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors duration-200"
                                disabled={isLoadingAction || permissions.length === 0}
                              >
                                {newRolePermissions.length === permissions.length ? (
                                  <>
                                    <X className="w-4 h-4" />
                                    إلغاء تحديد الكل
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    تحديد الكل
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded">
                              {permissions.length > 0 ? (
                                permissions.map((permission) => (
                                  <div
                                    key={permission}
                                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors duration-200"
                                  >
                                    <Checkbox
                                      id={`new-${permission}`}
                                      checked={newRolePermissions.includes(permission)}
                                      onCheckedChange={() => handleNewRolePermissionToggle(permission)}
                                      disabled={isLoadingAction}
                                    />
                                    <Label
                                      htmlFor={`new-${permission}`}
                                      className="text-gray-700 dark:text-gray-200 text-sm font-normal"
                                    >
                                      {permission}
                                    </Label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-4">
                                  لا توجد صلاحيات متاحة
                                </p>
                              )}
                            </div>
                          </div>
                        </Can>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsCreateRoleDialogOpen(false)}
                            className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            <X className="w-4 h-4" />
                            إلغاء
                          </Button>
                          <Button
                            onClick={handleCreateRole}
                            disabled={isLoadingAction || !newRoleName.trim()}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white transition-colors duration-200"
                          >
                            {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            إنشاء
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-3">
                    <div className="flex gap-2 items-end">
                      <div className="space-y-3 flex-1">
                        <Label className="text-gray-700 dark:text-gray-200 block mb-1">تعيين دور</Label>
                        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                          <SelectTrigger className="border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                            <SelectValue placeholder="اختر دورًا" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-700">
                            {roles.map((role) => (
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                                className="hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors duration-200"
                              >
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleAssignRole}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white h-10 transition-colors duration-200"
                        disabled={!selectedRoleId || isLoadingAction}
                      >
                        {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        تعيين
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Label className="text-gray-700 dark:text-gray-200 block mb-1">الأدوار الحالية</Label>
                      <div className="flex flex-wrap gap-2">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, index) => (
                            <div
                              key={`${role}-${index}`}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                                role === "admin"
                                  ? "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700"
                                  : "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700"
                              }`}
                            >
                              <span className="text-sm text-blue-800 dark:text-blue-200">
                                {role === "admin" && <Shield className="w-3 h-3 inline mr-1 text-purple-600" />}
                                {role}
                              </span>
                              {role !== "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveRole(role)}
                                  className="text-red-500 hover:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 w-5 h-5 rounded-full transition-colors duration-200"
                                  disabled={isLoadingAction || (isCurrentUser() && user.roles && user.roles.length <= 1)}
                                  title={isCurrentUser() && user.roles && user.roles.length <= 1 ? "لا يمكن إزالة آخر دور من حسابك" : ""}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 py-2 text-sm">لا توجد أدوار حالية</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Can action="manage" subject="All" fallback={<PermissionDeniedAlert subject="إدارة الصلاحيات" />}>
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">إدارة الصلاحيات</h3>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-gray-700 dark:text-gray-200 block">الصلاحيات المباشرة</Label>
                        <Button
                          onClick={handleSelectDeselectAll}
                          variant="outline"
                          className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors duration-200"
                          disabled={isLoadingAction || permissions.length === 0}
                        >
                          {pendingPermissions.length === permissions.length ? (
                            <>
                              <X className="w-4 h-4" />
                              إلغاء تحديد الكل
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              تحديد الكل
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                        {permissions.length > 0 ? (
                          permissions.map((permission) => (
                            <div
                              key={permission}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors duration-200"
                            >
                              <Checkbox
                                id={permission}
                                checked={pendingPermissions.includes(permission)}
                                onCheckedChange={() => handlePermissionToggle(permission)}
                                disabled={isLoadingAction}
                              />
                              <Label htmlFor={permission} className="text-gray-700 dark:text-gray-200 text-sm font-normal">
                                {permission}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-4">
                            لا توجد صلاحيات متاحة
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={handleUpdatePermissions}
                          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors duration-200"
                          disabled={isLoadingAction || JSON.stringify(pendingPermissions.sort()) === JSON.stringify(selectedPermissions.sort())}
                        >
                          {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          تحديث الصلاحيات
                        </Button>
                      </div>
                    </div>
                  </div>
                </Can>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Can>
  );
};

export default UserRoleManager;