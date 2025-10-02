import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Trash2, Pencil, Loader2, UserPlus, Save, X, AlertCircle, ShieldAlert, Archive, RotateCcw } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Can } from "@/components/Can";
import { AbilityContext } from "@/config/ability";
import UserRoleManager from "./UserRoleManager";
import { User } from "./user";

interface Role {
  id: number;
  name: string;
}

// مكون حوار تأكيد مخصص
const ConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description, 
  confirmText = "تأكيد", 
  cancelText = "إلغاء",
  variant = "default"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="flex items-center gap-2"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [trashedUsers, setTrashedUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentLoggedUser, setCurrentLoggedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrashed, setIsLoadingTrashed] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isTrashedUsersDialogOpen, setIsTrashedUsersDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<{ name?: string[]; email?: string[]; password?: string[] }>({});
  const { toast } = useToast();
  const ability = useContext(AbilityContext);

  // حالات جديدة للحوارات المنبثقة
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [forceDeleteDialog, setForceDeleteDialog] = useState({ open: false, user: null });
  const [restoreDialog, setRestoreDialog] = useState({ open: false, user: null });

  // Fetch current logged-in user
  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`/api/get-user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setCurrentLoggedUser(response.data.user);
    } catch (error: any) {
      console.error("Error fetching current user:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات المستخدم الحالي",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Fetch users and roles data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        axios.get(`/api/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        }),
        axios.get(`/api/roles`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        }),
      ]);
      setUsers(usersResponse.data.users);
      setRoles(rolesResponse.data.roles);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في جلب البيانات",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trashed users
  const fetchTrashedUsers = async () => {
    setIsLoadingTrashed(true);
    try {
      const response = await axios.get(`/api/trashed-users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setTrashedUsers(response.data.users);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في جلب المستخدمين المحذوفين",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingTrashed(false);
    }
  };

  // Restore a user
  const handleRestoreUser = async (userId: number) => {
    try {
      await axios.post(`/api/users/${userId}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      
      toast({
        title: "تم الاستعادة",
        description: "تم استعادة المستخدم بنجاح",
        variant: "default",
        duration: 3000,
      });
      
      // Refresh both lists
      fetchData();
      fetchTrashedUsers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في استعادة المستخدم",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Force delete a user
  const handleForceDeleteUser = async (userId: number) => {
    try {
      await axios.delete(`/api/users/${userId}/force-delete`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      
      toast({
        title: "تم الحذف النهائي",
        description: "تم الحذف النهائي للمستخدم بنجاح",
        variant: "default",
        duration: 3000,
      });
      
      // Refresh trashed users list
      fetchTrashedUsers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في الحذف النهائي",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  // Handle form submission for creating or updating a user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Prevent editing a user with admin role without proper permission
    if (currentUser && currentUser.roles?.includes("admin") && !ability.can("manage", "All")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لتعديل مستخدم بدور admin.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } };
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
      };

      let response;
      if (currentUser) {
        response = await axios.put(`/api/users/${currentUser.id}`, payload, config);
        setUsers(users.map((user) => (user.id === currentUser.id ? response.data.user : user)));
      } else {
        response = await axios.post(`/api/users`, payload, config);
        setUsers([...users, response.data.user]);
      }
      toast({
        title: currentUser ? "تم تعديل المستخدم" : "تم إنشاء المستخدم",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });
      setIsUserDialogOpen(false);
      resetForm();
    } catch (error: any) {
      setErrors(error.response?.data.errors || {});
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في العملية",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle edit user action
  const handleEditUser = (user: User) => {
    // Prevent opening edit dialog for admin user without proper permission
    if (user.roles?.includes("admin") && !ability.can("manage", "All")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لتعديل مستخدم بدور admin.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setCurrentUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
    });
    setIsUserDialogOpen(true);
  };

  // Check if user is the current logged-in user
  const isCurrentUser = (user: User) => {
    return currentLoggedUser && user.id === currentLoggedUser.id;
  };

  // Handle delete user action
  const handleDeleteUser = async (user: User) => {
    // Prevent deleting the currently logged-in user
    if (isCurrentUser(user)) {
      toast({
        title: "غير مسموح",
        description: "لا يمكنك حذف حسابك الخاص.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Prevent deleting a user with admin role without proper permission
    if (user.roles?.includes("admin") && !ability.can("manage", "All")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لحذف مستخدم بدور admin.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      await axios.delete(`/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setUsers(users.filter((u) => u.id !== user.id));
      toast({
        title: "تم حذف المستخدم",
        description: `تم حذف المستخدم ${user.name} بنجاح`,
        variant: "default",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في حذف المستخدم",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Reset form and current user
  const resetForm = () => {
    setCurrentUser(null);
    setForm({ name: "", email: "", password: "" });
    setErrors({});
  };

  // Handle dialog open/close
  const handleDialogOpenChange = (open: boolean) => {
    setIsUserDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div
      className="space-y-6 p-6 dark:bg-slate-900 transition-all duration-300"
      dir="rtl"
    >
      <Can action="read" subject="User">
        <Card className="bg-white/90 dark:bg-slate-800 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-xl rounded-xl transition-all duration-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-blue-800 dark:text-blue-300 text-2xl font-bold">
                إدارة المستخدمين
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* عرض معلومات المستخدم الحالي */}
                {currentLoggedUser && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      المستخدم الحالي:
                    </span>
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {currentLoggedUser.name}
                    </span>
                    {currentLoggedUser.roles?.includes("admin") && (
                      <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                )}

                {/* زر عرض المستخدمين المحذوفين */}
                <Can action="manage" subject="User">
                  <Dialog
                    open={isTrashedUsersDialogOpen}
                    onOpenChange={setIsTrashedUsersDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-gray-800"
                        onClick={fetchTrashedUsers}
                      >
                        <Archive className="w-4 h-4 ml-2" />
                        المستخدمين المحذوفين
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-orange-600 dark:text-orange-400">
                          المستخدمين المحذوفين
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                          قائمة المستخدمين الذين تم حذفهم
                        </DialogDescription>
                      </DialogHeader>

                      {isLoadingTrashed ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                      ) : trashedUsers.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الاسم</TableHead>
                              <TableHead>البريد الإلكتروني</TableHead>
                              <TableHead>تاريخ الحذف</TableHead>
                              <TableHead className="text-center">
                                الإجراءات
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trashedUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  {new Date(user.deleted_at).toLocaleDateString(
                                    "en-SA"
                                  )}
                                </TableCell>
                                <TableCell className="flex gap-2 justify-center">
                                  <Can action="manage" subject="User">
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        setRestoreDialog({ open: true, user })
                                      }
                                      className="text-green-600 border-green-300 hover:bg-green-50"
                                    >
                                      <RotateCcw className="w-4 h-4 ml-1" />
                                      استعادة
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        setForceDeleteDialog({
                                          open: true,
                                          user,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-4 h-4 ml-1" />
                                      حذف نهائي
                                    </Button>
                                  </Can>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          لا توجد حسابات محذوفة
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </Can>

                <Can action="create" subject="User">
                  <Dialog
                    open={isUserDialogOpen}
                    onOpenChange={handleDialogOpenChange}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800"
                      >
                        <UserPlus className="w-4 h-4 ml-2" />
                        إنشاء مستخدم جديد
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700">
                      <DialogHeader>
                        <DialogTitle className="text-blue-600 dark:text-blue-400">
                          {currentUser ? "تعديل المستخدم" : "إنشاء مستخدم جديد"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                          أدخل بيانات المستخدم.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className="text-gray-700 dark:text-gray-200"
                          >
                            الاسم
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="أدخل الاسم الكامل"
                            className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.name && (
                            <p className="text-red-500 text-sm">
                              {errors.name[0]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="text-gray-700 dark:text-gray-200"
                          >
                            البريد الإلكتروني
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="أدخل البريد الإلكتروني"
                            className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.email && (
                            <p className="text-red-500 text-sm">
                              {errors.email[0]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className="text-gray-700 dark:text-gray-200"
                          >
                            كلمة المرور
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder={
                              currentUser
                                ? "اتركه فارغاً للحفاظ على كلمة المرور"
                                : "كلمة المرور"
                            }
                            className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.password && (
                            <p className="text-red-500 text-sm">
                              {errors.password[0]}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setIsUserDialogOpen(false)}
                            className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            <X className="w-4 h-4" />
                            إلغاء
                          </Button>
                          <Button
                            type="submit"
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors duration-200"
                          >
                            {currentUser ? (
                              <>
                                <Save className="w-4 h-4" />
                                تحديث
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                إنشاء
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
                <span className="mr-2 text-gray-600 dark:text-gray-400">
                  جاري تحميل البيانات...
                </span>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-blue-100 dark:bg-slate-700">
                  <TableRow>
                    <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                      الاسم
                    </TableHead>
                    <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                      البريد الإلكتروني
                    </TableHead>
                    <Can action="manage" subject="Role">
                      <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                        الأدوار
                      </TableHead>
                    </Can>
                    <Can
                      action="update"
                      subject="User"
                      fallback={<TableHead />}
                    >
                      <TableHead className="text-center font-bold text-gray-800 dark:text-gray-200">
                        إجراءات
                      </TableHead>
                    </Can>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200"
                      >
                        <TableCell className="font-medium dark:text-gray-200">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {isCurrentUser(user) && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                أنت
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-200">
                          {user.email}
                        </TableCell>
                        <Can action="manage" subject="Role">
                          <TableCell className="dark:text-gray-200">
                            <div className="flex flex-wrap gap-1">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.map((role, index) => (
                                  <span
                                    key={`${role}-${index}`}
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      role === "admin"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                    }`}
                                  >
                                    {role === "admin" && (
                                      <ShieldAlert className="w-3 h-3 inline mr-1" />
                                    )}
                                    {role}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  بدون أدوار
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </Can>
                        <Can
                          action="update"
                          subject="User"
                          fallback={<TableCell />}
                        >
                          <TableCell className="flex gap-2 justify-center">
                            <UserRoleManager
                              user={user}
                              roles={roles}
                              onUserUpdated={(updatedUser) => {
                                setUsers(
                                  users.map((u) =>
                                    u.id === updatedUser.id ? updatedUser : u
                                  )
                                );
                              }}
                              disabled={isCurrentUser(user)}
                              currentLoggedUser={currentLoggedUser}
                            />
                            <Can action="update" subject="User">
                              <Button
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                disabled={
                                  (user.roles?.includes("admin") &&
                                    !ability.can("manage", "All")) ||
                                  isCurrentUser(user)
                                }
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Pencil className="w-4 h-4" />
                                تعديل
                              </Button>
                            </Can>
                            <Can action="delete" subject="User">
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  setDeleteDialog({ open: true, user })
                                }
                                disabled={
                                  isCurrentUser(user) ||
                                  (user.roles?.includes("admin") &&
                                    !ability.can("manage", "All"))
                                }
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                                {isCurrentUser(user) ? "لا يمكن الحذف" : "حذف"}
                              </Button>
                            </Can>
                          </TableCell>
                        </Can>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        لا يوجد مستخدمون متاحون
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Can>

      {/* حوارات التأكيد */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={() => handleDeleteUser(deleteDialog.user)}
        title="تأكيد الحذف"
        description={`هل أنت متأكد من أنك تريد حذف المستخدم ${deleteDialog.user?.name}؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="destructive"
      />

      <ConfirmationDialog
        open={forceDeleteDialog.open}
        onOpenChange={(open) =>
          setForceDeleteDialog({ ...forceDeleteDialog, open })
        }
        onConfirm={() => handleForceDeleteUser(forceDeleteDialog.user.id)}
        title="تأكيد الحذف النهائي"
        description={`هل أنت متأكد من الحذف النهائي , سيتم حذف جميع الفواتبر المرتبطة بمستخدم ${forceDeleteDialog.user?.name}؟ لا يمكن التراجع عن هذا الإجراء`}
        confirmText="حذف نهائي"
        cancelText="إلغاء"
        variant="destructive"
      />

      <ConfirmationDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog({ ...restoreDialog, open })}
        onConfirm={() => handleRestoreUser(restoreDialog.user.id)}
        title="تأكيد الاستعادة"
        description={`هل أنت متأكد من أنك تريد استعادة المستخدم ${restoreDialog.user?.name}؟`}
        confirmText="استعادة"
        cancelText="إلغاء"
      />
    </div>
  );
};

export default UserManagement;