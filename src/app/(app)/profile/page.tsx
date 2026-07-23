"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { humanizeError } from "@/components/data-state";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { useAuth, useRole } from "@/lib/auth";
import { AvatarImageError, initialsFromEmail, validateImageFile } from "@/lib/avatar";
import { useMyClient, useMyProfile } from "@/lib/hooks";
import { useDateFormat } from "@/lib/date-format";
import { LOCALES, useTranslation } from "@/lib/i18n/i18n";
import { queryKeys } from "@/lib/query-keys";
import { usersApi } from "@/lib/resources";
import { CALENDAR_FORMATS, type CalendarFormat, type PreferredLanguage, type UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const { t } = useTranslation();
  const profile = useMyProfile();

  return (
    <>
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <PhotoCard />
      <AccountCard />
      {profile.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-40 w-full" />
        </Card>
      ) : profile.data ? (
        <>
          <PreferencesCard key={profile.dataUpdatedAt} profile={profile.data} />
          <PasswordCard />
        </>
      ) : null}
    </>
  );
}

function PhotoCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profile = useMyProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (avatarUrl: string | null) => usersApi.updateAvatar(avatarUrl),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.myProfile, updated);
      toast.success(t("profile.toastPhotoUpdated"));
      setPendingFile(null);
    },
    onError: (error) => toast.error(t("profile.couldntUpdatePhoto"), { description: humanizeError(error) }),
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!file) return;
    try {
      validateImageFile(file);
      setPendingFile(file);
    } catch (error) {
      toast.error(t("profile.invalidImageFile"), { description: error instanceof AvatarImageError ? error.message : undefined });
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.photoTitle")}</CardTitle>
          <CardDescription>{t("profile.photoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <UserAvatar avatarUrl={profile.data?.avatarUrl} initials={initialsFromEmail(user?.email ?? "")} className="size-16 text-lg" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => fileInputRef.current?.click()}>
                {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {t("profile.uploadPhoto")}
              </Button>
              {profile.data?.avatarUrl ? (
                <Button type="button" variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(null)}>
                  {t("profile.removePhoto")}
                </Button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">{t("profile.photoHint")}</p>
          </div>
        </CardContent>
      </Card>
      <AvatarCropDialog
        file={pendingFile}
        isSaving={mutation.isPending}
        onCancel={() => setPendingFile(null)}
        onConfirm={(dataUrl) => mutation.mutate(dataUrl)}
      />
    </>
  );
}

function AccountCard() {
  const { t, dir } = useTranslation();
  const { user } = useAuth();
  const { role } = useRole();
  const client = useMyClient();
  const profile = useMyProfile();
  const { formatDate } = useDateFormat();

  const clientName = user?.clientId ? (client.data?.client?.name ?? "…") : t("profile.noClient");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.accountTitle")}</CardTitle>
        <CardDescription>{t("profile.accountDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label={t("profile.email")} value={user?.email ?? ""} dir={dir} />
        <Field label={t("profile.role")} value={role ? t(`roles.${role}`) : ""} dir={dir} />
        <Field label={t("profile.client")} value={clientName} dir={dir} />
        <Field label={t("profile.memberSince")} value={profile.data ? formatDate(profile.data.createdAt) : "…"} dir={dir} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value, dir }: { label: string; value: string; dir: "ltr" | "rtl" }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm" dir={dir}>
        {value}
      </p>
    </div>
  );
}

// A blank Combobox value represents "no preference" (server-side null) — the same sentinel
// convention used for the jurisdiction/state picker elsewhere in the app.
const NO_PREFERENCE = "";

function PreferencesCard({ profile }: { profile: UserProfile }) {
  const { t, setLocale } = useTranslation();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<string>(profile.preferredLanguage ?? NO_PREFERENCE);
  const [dateFormat, setDateFormat] = useState<string>(profile.preferredDateFormat ?? NO_PREFERENCE);

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        preferredLanguage: (language || null) as PreferredLanguage | null,
        preferredDateFormat: (dateFormat || null) as CalendarFormat | null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.myProfile, updated);
      // Applies the new language to this session immediately, in addition to persisting it —
      // clearing the preference (null) leaves whatever language this browser is already using.
      if (updated.preferredLanguage) setLocale(updated.preferredLanguage);
      toast.success(t("profile.toastPreferencesSaved"));
    },
    onError: (error) => toast.error(t("profile.couldntSavePreferences"), { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.preferencesTitle")}</CardTitle>
          <CardDescription>{t("profile.preferencesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="preferredLanguage">{t("profile.language")}</Label>
            <Combobox id="preferredLanguage" value={language} onValueChange={setLanguage}>
              <ComboboxItem value={NO_PREFERENCE}>{t("profile.languageNoPreference")}</ComboboxItem>
              {LOCALES.map((code) => (
                <ComboboxItem key={code} value={code}>
                  {t(`language.${code}`)}
                </ComboboxItem>
              ))}
            </Combobox>
            <p className="text-xs text-muted-foreground">{t("profile.languageHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferredDateFormat">{t("profile.dateFormat")}</Label>
            <Combobox id="preferredDateFormat" value={dateFormat} onValueChange={setDateFormat}>
              <ComboboxItem value={NO_PREFERENCE}>{t("profile.dateFormatNoPreference")}</ComboboxItem>
              {CALENDAR_FORMATS.map((format) => (
                <ComboboxItem key={format} value={format}>
                  {format}
                </ComboboxItem>
              ))}
            </Combobox>
            <p className="text-xs text-muted-foreground">{t("profile.dateFormatHint")}</p>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("profile.savePreferences")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success(t("profile.toastPasswordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => toast.error(t("profile.couldntChangePassword"), { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword) return toast.error(t("profile.currentPasswordRequired"));
    if (newPassword.length < 8) return toast.error(t("profile.newPasswordMinLength"));
    if (newPassword !== confirmPassword) return toast.error(t("profile.passwordMismatch"));
    mutation.mutate();
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.passwordTitle")}</CardTitle>
          <CardDescription>{t("profile.passwordDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword">{t("profile.confirmNewPassword")}</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="outline" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("profile.changePassword")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
