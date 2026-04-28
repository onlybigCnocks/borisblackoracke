import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send } from "lucide-react";

const ContactCTA = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setOrganization(""); setEmail(""); setMessage(""); setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const org = organization.trim();
    const em = email.trim();
    const msg = message.trim();

    if (org.length < 1 || org.length > 150) {
      setError(t("contactCta.errOrg")); return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(em)) {
      setError(t("contactCta.errEmail")); return;
    }
    if (msg.length < 5 || msg.length > 2000) {
      setError(t("contactCta.errMsg")); return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-contact-message", {
        body: { organization: org, email: em, message: msg },
      });
      if (fnErr || !data?.ok) throw fnErr || new Error("send failed");

      toast({
        title: t("contactCta.successTitle"),
        description: t("contactCta.successDesc"),
      });
      reset();
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError(t("contactCta.errSend"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card p-8 md:p-12 bg-radial-red glow-card">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Mail size={14} />
              <span>{t("contactCta.label")}</span>
            </div>
            <h2 className="mb-3 text-2xl font-bold leading-tight text-foreground md:text-3xl lg:text-4xl">
              {t("contactCta.title")}
            </h2>
            <p className="font-mono text-sm text-muted-foreground md:text-base">
              {t("contactCta.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-dim btn-glow"
          >
            {t("contactCta.cta")}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("contactCta.formTitle")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("contactCta.formDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {t("contactCta.orgLabel")}
              </label>
              <Input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={t("contactCta.orgPlaceholder")}
                maxLength={150}
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {t("contactCta.emailLabel")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contactCta.emailPlaceholder")}
                maxLength={254}
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {t("contactCta.msgLabel")}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("contactCta.msgPlaceholder")}
                rows={5}
                maxLength={2000}
                disabled={submitting}
                required
              />
              <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                {message.length}/2000
              </p>
            </div>

            {error && <p className="font-mono text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? t("contactCta.sending") : t("contactCta.send")}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContactCTA;
