"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Truck,
  Shield,
  Clock,
  MapPin,
  Package,
  BarChart3,
  Smartphone,
  ArrowRight,
  Zap,
} from "lucide-react";

const APP_STORE_URL = "https://apps.apple.com/us/app/bee-deliv/id6759854417";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.ub.express";

const REGIONS = [
  "Төв дүүрэг",
  "Хан-Уул дүүрэг",
  "Баянгол дүүрэг",
  "Сонгинохайрхан дүүрэг",
  "Сүхбаатар дүүрэг",
  "Чингэлтэй дүүрэг",
  "Баянзүрх дүүрэг",
  "Налайх дүүрэг",
];

const SERVICES = [
  {
    icon: Zap,
    title: "Шуурхай хүргэлт",
    description:
      "Захиалгыг хотын аль ч цэгт хамгийн богино хугацаанд, аюулгүй хүргэнэ.",
  },
  {
    icon: Shield,
    title: "Итгэлтэй үйлчилгээ",
    description:
      "Бүртгэлтэй жолооч, тодорхой төлөв — захиалга бүр хяналттай.",
  },
  {
    icon: Clock,
    title: "24/7 систем",
    description: "Админ самбар, тайлан, хүргэлтийн урсгал — бүх цагт.",
  },
  {
    icon: Package,
    title: "Олон төрлийн ачаа",
    description: "Хоол, бараа, эмийн сан зэрэг олон төрлийн захиалга.",
  },
  {
    icon: BarChart3,
    title: "Бодит тайлан",
    description: "Хүргэлт, тооцоо, барааны үлдэгдлийг нэг дороос харах.",
  },
  {
    icon: MapPin,
    title: "Бүх дүүрэг",
    description: "Улаанбаатар хотын 8 дүүрэгт хүргэлтийн сүлжээ.",
  },
];

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info">(
    "info"
  );
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    document.title = "BeeDeliv — Улаанбаатарын хүргэлтийн платформ";
  }, []);

  const handleLogin = async () => {
    setMessage("");
    if (!username || !password) {
      setMessageType("error");
      setMessage("Хэрэглэгчийн нэр болон нууц үг оруулна уу");
      return;
    }

    setLoading(true);
    try {
      if (!API_URL) {
        setMessageType("error");
        setMessage("API URL тохируулаагүй байна (NEXT_PUBLIC_API_URL)");
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Network error" }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        setMessageType("error");
        setMessage(data.message || "Нэвтрэхэд алдаа гарлаа");
      } else {
        const token = data.accessToken || data.token;
        const user = data.user;

        if (!token || !user) {
          setMessageType("error");
          setMessage("Invalid response from server");
          setLoading(false);
          return;
        }

        try {
          const { setSecureItem } = await import("@/lib/security/secure-storage");
          await setSecureItem("token", token);
          await setSecureItem("user", user);
          await setSecureItem("permissions", user.permissions || []);
          await setSecureItem("role", user.role?.toString() ?? "");
          await setSecureItem("username", user.username || "");
        } catch (e) {
          console.warn("Secure storage not available, using localStorage:", e);
        }

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("permissions", JSON.stringify(user.permissions || []));
        localStorage.setItem("role", user.role?.toString() ?? "");
        localStorage.setItem("username", user.username || "");

        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        const isSecure = window.location.protocol === "https:";
        document.cookie = `token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${isSecure ? "; Secure" : ""}`;

        setMessageType("success");
        setMessage("Амжилттай нэвтэрлээ");

        setTimeout(() => {
          window.location.href = "/admin";
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Серверийн алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const messageStyles = {
    success:
      "text-emerald-700 bg-emerald-50 border-emerald-200",
    error: "text-red-700 bg-red-50 border-red-200",
    info: "text-slate-600 bg-slate-50 border-slate-200",
  }[messageType];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLink =
    "text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors";

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-orange-100/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#hero" className="flex items-center gap-2.5">
            <Image
              src="/beelogo.jpg"
              alt="BeeDeliv"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover shadow-sm"
            />
            <span className="text-lg font-bold tracking-tight">
              Bee<span className="text-orange-600">Deliv</span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <button type="button" onClick={() => scrollToSection("hero")} className={navLink}>
              Нүүр
            </button>
            <button type="button" onClick={() => scrollToSection("services")} className={navLink}>
              Үйлчилгээ
            </button>
            <button type="button" onClick={() => scrollToSection("regions")} className={navLink}>
              Бүс нутаг
            </button>
            <button type="button" onClick={() => scrollToSection("download")} className={navLink}>
              Апп
            </button>
          </nav>
          <Button
            size="sm"
            className="rounded-full bg-orange-600 hover:bg-orange-700 font-semibold shadow-md shadow-orange-600/20"
            onClick={() => scrollToSection("login")}
          >
            Нэвтрэх
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-800">
              <Truck className="h-4 w-4" />
              Улаанбаатарын хүргэлтийн платформ
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
                Хүргэлтээ{" "}
                <span className="text-orange-600">хурдан</span>,{" "}
                удирдлагаа{" "}
                <span className="text-orange-600">тодорхой</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                BeeDeliv нь дэлгүүр, жолооч, админыг нэг системд холбож,
                захиалга хүлээн авах, хуваарилах, тайлан гаргах ажлыг
                хялбар болгоно.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {["Шуурхай", "Ил тод", "Нэгдсэн систем"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              className="rounded-full border-slate-300 font-semibold"
              onClick={() => scrollToSection("download")}
            >
              Апп татах
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Login */}
          <div id="login" className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md border-0 shadow-xl shadow-orange-900/5 ring-1 ring-slate-200/80 rounded-3xl bg-white">
              <CardHeader className="space-y-3 pb-2 pt-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                  <Image
                    src="/beelogo.jpg"
                    alt="BeeDeliv"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Нэвтрэх</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Админ удирдлагын самбар
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-semibold text-slate-700">
                    Хэрэглэгчийн нэр
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Нэвтрэх нэр"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:ring-orange-500"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold text-slate-700">
                    Нууц үг
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:ring-orange-500"
                    disabled={loading}
                  />
                </div>
                {message && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${messageStyles}`}
                  >
                    {message}
                  </div>
                )}
              </CardContent>

              <CardFooter className="px-6 pb-8 pt-2">
                <Button
                  className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold hover:bg-orange-700 shadow-lg shadow-orange-600/25"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Уншиж байна..." : "Нэвтрэх"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative border-t border-slate-200/80 bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Яагаад BeeDeliv вэ?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
              Хүргэлтийн бүх үе шатыг нэг платформоор удирдах боломж
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="group border-slate-200/80 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md rounded-2xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Regions */}
      <section
        id="regions"
        className="relative px-4 py-20 sm:px-6 bg-gradient-to-b from-orange-50/80 to-[#faf9f7]"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Хүргэлтийн бүс
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Улаанбаатар хотын 8 дүүрэгт үйлчилж байна
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {REGIONS.map((region) => (
              <div
                key={region}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-center text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80"
              >
                <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
                {region}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white sm:px-12 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                <Smartphone className="h-4 w-4" />
                Гар утасны апп
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">
                BeeDeliv аппыг татаж аваарай
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                Захиалга өгөх, хүргэлт хянах, жолоочийн ажлыг удирдах —
                бүгдийг гар утсаараа.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold"
                  onClick={() => window.open(APP_STORE_URL, "_blank")}
                >
                  App Store
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 font-semibold"
                  onClick={() => window.open(PLAY_STORE_URL, "_blank")}
                >
                  Google Play
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="rounded-3xl bg-white/10 p-8 ring-1 ring-white/20">
                <Image
                  src="/beelogo.jpg"
                  alt="BeeDeliv app"
                  width={200}
                  height={200}
                  className="mx-auto h-48 w-48 rounded-2xl object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="/beelogo.jpg"
                alt="BeeDeliv"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="text-lg font-bold">
                Bee<span className="text-orange-600">Deliv</span>
              </span>
            </div>
            <p className="max-w-xs text-sm text-slate-600 leading-relaxed">
              Улаанбаатарын хурдан, ил тод хүргэлтийн нэгдсэн систем.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-bold text-slate-900 mb-3">Цэс</p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <button type="button" onClick={() => scrollToSection("hero")} className="hover:text-orange-600">
                    Нүүр
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection("services")} className="hover:text-orange-600">
                    Үйлчилгээ
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection("download")} className="hover:text-orange-600">
                    Апп татах
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-3">Холбоо барих</p>
              <ul className="space-y-2 text-slate-600">
                <li>99633844</li>
                <li>info@beedeliv.mn</li>
                <li>Улаанбаатар хот</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-slate-100 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} BeeDeliv. Бүх эрх хуулиар хамгаалагдсан.
        </p>
      </footer>
    </div>
  );
}
