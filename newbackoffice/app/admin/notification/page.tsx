"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Store,
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  fetchPushAudienceStats,
  sendPushToRole,
  fetchPushStatus,
  type AudienceStat,
} from "./services/notification.service";

const ROLE_MERCHANT = 2;
const ROLE_DRIVER = 3;

export default function NotificationPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audiences, setAudiences] = useState<AudienceStat[]>([]);
  const [firebaseReady, setFirebaseReady] = useState<boolean | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sendingRole, setSendingRole] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Мэдэгдэл илгээх";
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const [stats, status] = await Promise.all([
        fetchPushAudienceStats(),
        fetchPushStatus().catch(() => ({ firebase_admin_ready: false })),
      ]);
      setAudiences(stats.audiences);
      setFirebaseReady(stats.firebase_ready && status.firebase_admin_ready);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Статистик ачааллахад алдаа";
      toast.error(message);
      setFirebaseReady(false);
    } finally {
      setLoadingStats(false);
    }
  };

  const getAudience = (roleId: number) =>
    audiences.find((a) => a.role_id === roleId);

  const handleSend = async (roleId: number, roleLabel: string) => {
    if (!title.trim() || !body.trim()) {
      toast.error("Гарчиг болон мессеж оруулна уу");
      return;
    }

    const audience = getAudience(roleId);
    if (!audience?.with_token) {
      toast.warning(
        `${roleLabel}: FCM бүртгэлтэй төхөөрөмж байхгүй. Тэд апп-аар нэвтэрч мэдэгдэл зөвшөөрөх хэрэгтэй.`
      );
      return;
    }

    if (
      !confirm(
        `${roleLabel} (${audience.with_token} төхөөрөмж) руу мэдэгдэл илгээх үү?`
      )
    ) {
      return;
    }

    setSendingRole(roleId);
    try {
      const result = await sendPushToRole(roleId, title.trim(), body.trim());
      if (result.sent && result.sent > 0) {
        toast.success(
          `Амжилттай: ${result.sent} төхөөрөмж рүү илгээгдлээ` +
            (result.failed ? ` (${result.failed} амжилтгүй)` : "")
        );
        setTitle("");
        setBody("");
      } else {
        toast.warning(
          result.message || "FCM бүртгэлтэй төхөөрөмж олдсонгүй эсвэл илгээгдсэнгүй"
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Илгээхэд алдаа гарлаа";
      toast.error(message);
    } finally {
      setSendingRole(null);
    }
  };

  const merchantStats = getAudience(ROLE_MERCHANT);
  const driverStats = getAudience(ROLE_DRIVER);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 px-4 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Мэдэгдэл илгээх</h1>
        <p className="text-gray-600 mt-2">
          Жолооч болон харилцагчид (merchant) руу push мэдэгдэл илгээнэ
        </p>
      </div>

      {firebaseReady === false && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Firebase тохируулаагүй байна</p>
              <p className="mt-1">
                Сервер дээр FCM тохиргоо хийсний дараа мэдэгдэл илгээгдэнэ.
                delivery/.env дээр FIREBASE_SERVICE_ACCOUNT_PATH шалгана уу.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {firebaseReady === true && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-900 font-medium">
              Push систем бэлэн байна
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-600" />
              Харилцагч (Merchant)
            </CardTitle>
            <CardDescription>role_id = 2</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-gray-500">Ачаалж байна...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {merchantStats?.with_token ?? 0}
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    / {merchantStats?.total ?? 0} бүртгэлтэй
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  FCM бүртгэлтэй төхөөрөмж
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Жолооч (Driver)
            </CardTitle>
            <CardDescription>role_id = 3</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-gray-500">Ачаалж байна...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {driverStats?.with_token ?? 0}
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    / {driverStats?.total ?? 0} бүртгэлтэй
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  FCM бүртгэлтэй төхөөрөмж
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Мэдэгдлийн агуулга
          </CardTitle>
          <CardDescription>
            Гарчиг болон мессежийг бөглөөд доорх товчоор бүх жолооч эсвэл бүх
            харилцагч руу илгээнэ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="push-title">Гарчиг *</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Жишээ: Шинэ мэдэгдэл"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-body">Мессеж *</Label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Мэдэгдлийн текст..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">{body.length}/500</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
          disabled={
            sendingRole !== null ||
            loadingStats ||
            !title.trim() ||
            !body.trim() ||
            !merchantStats?.with_token
          }
          onClick={() => handleSend(ROLE_MERCHANT, "Бүх харилцагч")}
        >
          <Store className="h-4 w-4 mr-2" />
          {sendingRole === ROLE_MERCHANT
            ? "Илгээж байна..."
            : "Бүх харилцагч руу илгээх"}
        </Button>

        <Button
          className="flex-1 h-12"
          variant="default"
          disabled={
            sendingRole !== null ||
            loadingStats ||
            !title.trim() ||
            !body.trim() ||
            !driverStats?.with_token
          }
          onClick={() => handleSend(ROLE_DRIVER, "Бүх жолооч")}
        >
          <Truck className="h-4 w-4 mr-2" />
          {sendingRole === ROLE_DRIVER
            ? "Илгээж байна..."
            : "Бүх жолооч руу илгээх"}
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Зөвхөн апп суулгаж, нэвтэрч, мэдэгдэл зөвшөөрсөн хэрэглэгчид хүлээн авна.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={loadingStats}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loadingStats ? "animate-spin" : ""}`}
          />
          Шинэчлэх
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">Admin = 1</Badge>
        <Badge variant="outline">Харилцагч = 2</Badge>
        <Badge variant="outline">Жолооч = 3</Badge>
      </div>
    </div>
  );
}
