// components/CameraBarcodeScanner.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertCircle, Camera, Scan, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Scanner } from '@yudiel/react-qr-scanner';

interface CameraBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  disabled?: boolean;
}

const CameraBarcodeScanner = ({
  onBarcodeScanned,
  disabled = false
}: CameraBarcodeScannerProps) => {
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanTimeout, setScanTimeout] = useState(false); // حالة لفشل المسح بعد وقت
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // معالجة الباركود الممسوح
  const handleBarcodeScanned = (result: string) => {
    if (!result || result === lastScannedBarcode) return;
    
    console.log("تم مسح الباركود:", result);
    setLastScannedBarcode(result);
    
    // تنظيف النتيجة من أي أحرف غير مرغوب فيها
    const cleanBarcode = result.trim().replace(/[^\d]/g, '');
    
    if (cleanBarcode && cleanBarcode.length >= 8 && cleanBarcode.length <= 20) {
      handleBarcodeDetected(cleanBarcode);
    } else {
      console.log("باركود غير صالح:", cleanBarcode);
      toast({
        title: "⚠️ باركود غير صالح",
        description: "الباركود الممسوح غير صحيح. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  // معالجة الباركود المكتشف
  const handleBarcodeDetected = (detectedBarcode: string) => {
    toast({
      title: "✅ تم مسح الباركود بنجاح",
      description: `الباركود: ${detectedBarcode}`,
    });

    // تمرير الباركود إلى الدالة الأم
    onBarcodeScanned(detectedBarcode);

    // إغلاق نافذة الكاميرا بعد نجاح المسح مباشرة
    setTimeout(() => {
      setIsCameraDialogOpen(false);
      setIsScanning(false);
    }, 800);
  };

  // معالجة أخطاء المسح
  const handleScanError = (error: any) => {
    console.error("خطأ في المسح:", error);
    if (error.name === "NotAllowedError") {
      setCameraError("تم رفض الإذن للوصول إلى الكاميرا. يرجى السماح باستخدام الكاميرا من إعدادات المتصفح.");
    } else if (error.name === "NotFoundError") {
      setCameraError("لم يتم العثور على كاميرا. تأكد من توصيل الكاميرا بشكل صحيح.");
    } else {
      setCameraError("حدث خطأ في الكاميرا. تأكد من إعطاء الإذن اللازم.");
    }
    setIsScanning(false);
  };

  // بدء تشغيل الكاميرا مع timeout لفشل المسح
  const startCamera = () => {
    setCameraError(null);
    setScanTimeout(false);
    setIsScanning(true);
    setLastScannedBarcode(null);

    // تعيين timeout لـ 30 ثانية لإظهار رسالة فشل إذا لم يتم المسح
    scanTimeoutRef.current = setTimeout(() => {
      setScanTimeout(true);
      setCameraError("لم يتم العثور على باركود صالح خلال الوقت المحدد. يرجى التأكد من وضوح الباركود ومحاولة مرة أخرى أو استخدام طريقة أخرى.");
      setIsScanning(false);
    }, 30000); // 30 ثانية
  };

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);
    setScanTimeout(false);
  };

  // تنظيف الموارد عند إغلاق النافذة
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // إعادة تعيين حالة المسح عند فتح/إغلاق النافذة
  useEffect(() => {
    if (!isCameraDialogOpen) {
      stopCamera();
      setLastScannedBarcode(null);
    } else {
      // بدء المسح تلقائياً عند فتح النافذة
      setTimeout(() => {
        startCamera();
      }, 500);
    }
  }, [isCameraDialogOpen]);

  return (
    <>
      {/* زر فتح الكاميرا */}
      <Button
        type="button"
        onClick={() => setIsCameraDialogOpen(true)}
        disabled={disabled}
        className="h-10 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-none shadow-lg"
        title="مسح الباركود بالكاميرا"
      >
        <Camera className="w-4 h-4" />
      </Button>

      {/* نافذة الكاميرا */}
      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-200 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              مسح الباركود بالكاميرا
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              قم بتوجيه الكاميرا نحو الباركود لمسحه تلقائياً
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {cameraError || scanTimeout ? (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium mb-2">خطأ في المسح</p>
                <p>{cameraError}</p>
                <Button
                  onClick={startCamera}
                  className="mt-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  محاولة مرة أخرى
                </Button>
              </div>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden">
                {isScanning ? (
                  <div className="w-full h-64">
                    <Scanner
                      onScan={(results) => {
                        if (results && results.length > 0) {
                          handleBarcodeScanned(results[0].rawValue);
                        }
                      }}
                      onError={handleScanError}
                      constraints={{
                        facingMode: "environment", // الكاميرا الخلفية
                      }}
                      formats={["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e"]}
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>جاري تحضير الكاميرا...</p>
                    </div>
                  </div>
                )}
                
                {/* مؤشر المسح */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 rounded-lg w-64 h-32 relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-green-400"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-green-400"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-green-400"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-green-400"></div>
                  </div>
                </div>
                
                {isScanning && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="bg-black/70 text-white px-3 py-2 rounded-full text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      جاري البحث عن الباركود...
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              {!isScanning && !cameraError && !scanTimeout && (
                <Button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  تشغيل الكاميرا
                </Button>
              )}
              
              {isScanning && (
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                >
                  إيقاف المسح
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  setIsCameraDialogOpen(false);
                  stopCamera();
                }}
                className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                إغلاق
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>إضاءة جيدة</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>مسافة 15-30 سم</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>تجنب الظلال</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>باركود واضح</span>
                </div>
              </div>
              
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  <strong>ملاحظة:</strong> بمجرد مسح الباركود، سيتم إغلاق النافذة تلقائياً وإضافة الباركود إلى الحقل
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CameraBarcodeScanner;