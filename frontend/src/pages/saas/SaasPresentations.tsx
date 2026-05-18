import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SaasLayout from '@/components/SaasLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { InlineServiceDemo } from '@/components/saas/InlineServiceDemo';
import { useI18n } from '@/lib/i18n';
import { client as sdkClient, api } from '@/lib/api';
import {
  Presentation, Loader2, Sparkles, ChevronLeft, ChevronRight,
  Star, Zap, BarChart3, Quote, Image, List, Target,
  Rocket, Users, TrendingUp, Copy, Download,
  FileText, FileSpreadsheet, FileJson, FileType,
} from 'lucide-react';
import {
  exportPDF, exportPresentationPDF, exportTXT, exportMarkdown,
  exportHTML, exportJSON, exportCSV, exportExcel,
} from '@/lib/export-utils';

interface SlideData {
  slide_number: number;
  layout: string;
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  stats?: Array<{ value: string; label: string }>;
  visual_notes?: string;
  speaker_notes?: string;
}

interface GeneratedPresentation {
  title: string;
  pres_type: string;
  slides: SlideData[];
  metadata: Record<string, any>;
}

const PRES_TYPES = [
  { value: 'pitch_deck', label: 'Pitch Deck', icon: <Rocket className="w-5 h-5" />, desc: 'Presentación para inversores', color: 'from-violet-500 to-purple-500' },
  { value: 'proposal', label: 'Propuesta', icon: <Target className="w-5 h-5" />, desc: 'Propuesta comercial visual', color: 'from-blue-500 to-cyan-500' },
  { value: 'quarterly', label: 'Reporte Trimestral', icon: <BarChart3 className="w-5 h-5" />, desc: 'Resultados y métricas', color: 'from-emerald-500 to-green-500' },
  { value: 'case_study', label: 'Caso de Éxito', icon: <TrendingUp className="w-5 h-5" />, desc: 'Storytelling de resultados', color: 'from-orange-500 to-amber-500' },
  { value: 'onboarding', label: 'Onboarding', icon: <Users className="w-5 h-5" />, desc: 'Bienvenida a nuevos clientes', color: 'from-pink-500 to-rose-500' },
  { value: 'sales', label: 'Ventas', icon: <Star className="w-5 h-5" />, desc: 'Presentación de ventas', color: 'from-indigo-500 to-blue-500' },
];

const LAYOUT_ICONS: Record<string, React.ReactNode> = {
  title: <Presentation className="w-4 h-4" />,
  content: <List className="w-4 h-4" />,
  stats: <BarChart3 className="w-4 h-4" />,
  comparison: <TrendingUp className="w-4 h-4" />,
  quote: <Quote className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  bullets: <List className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  cta: <Target className="w-4 h-4" />,
  closing: <Star className="w-4 h-4" />,
};

const SLIDE_GRADIENTS = [
  'from-violet-600 via-purple-600 to-indigo-700',
  'from-blue-600 via-cyan-600 to-teal-600',
  'from-emerald-600 via-green-600 to-teal-600',
  'from-orange-600 via-amber-600 to-yellow-600',
  'from-pink-600 via-rose-600 to-red-600',
  'from-indigo-600 via-blue-600 to-cyan-600',
  'from-fuchsia-600 via-purple-600 to-violet-600',
  'from-teal-600 via-emerald-600 to-green-600',
];

export default function SaasPresentations() {
  const { user, loading: authLoading, login } = useAuth();
  const { ts } = useI18n();
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSector, setClientSector] = useState('');
  const [brief, setBrief] = useState('');
  const [slidesCount, setSlidesCount] = useState('12');
  const [language, setLanguage] = useState('es');
  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<GeneratedPresentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'create' | 'slideshow' | 'grid'>('create');
  const [presHistory, setPresHistory] = useState<Array<Record<string, unknown>>>([]);

  const loadPresHistory = useCallback(async () => {
    try {
      const res = await api.getPresentationHistory(0, 20);
      setPresHistory((res.items as Array<Record<string, unknown>>) || []);
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasPresentations] Error:", err); /* backend unavailable */ }
  }, []);

  useEffect(() => {
    if (user) loadPresHistory();
  }, [user, loadPresHistory]);

  const handleGenerate = async () => {
    if (!selectedType || !title.trim()) {
      toast.error('Selecciona un tipo y escribe un título');
      return;
    }
    setGenerating(true);
    setPresentation(null);
    try {
      const res = await sdkClient.apiCall.invoke({
        url: '/api/v1/saas-tools/generate-presentation',
        method: 'POST',
        data: {
          pres_type: selectedType,
          title,
          client_name: clientName,
          client_sector: clientSector,
          content_brief: brief,
          slides_count: parseInt(slidesCount),
          language,
        },
      });
      setPresentation(res.data);
      setCurrentSlide(0);
      setViewMode('slideshow');
      // Persist to backend presentation_history table
      try {
        await api.createPresentationHistory({
          title,
          pres_type: selectedType,
          client_name: clientName,
          client_sector: clientSector,
          slides_count: parseInt(slidesCount),
          language,
          slides_json: JSON.stringify(res.data.slides || []),
          status: "completed",
        });
        loadPresHistory();
      } catch (err) { if (import.meta.env.DEV) console.warn("[SaasPresentations] Error:", err); /* non-critical */ }
      toast.success('✅ Presentación élite generada');
    } catch (err: any) {
      toast.error(err?.data?.detail || 'Error al generar presentación');
    } finally {
      setGenerating(false);
    }
  };

  const nextSlide = () => {
    if (presentation && currentSlide < presentation.slides.length - 1) setCurrentSlide((p) => p + 1);
  };
  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide((p) => p - 1);
  };

  const handleCopy = () => {
    if (!presentation) return;
    const text = presentation.slides
      .map((s) => {
        let out = `--- Slide ${s.slide_number}: ${s.title} ---\n`;
        if (s.subtitle) out += `${s.subtitle}\n`;
        if (s.content) out += `${s.content}\n`;
        if (s.bullets) out += s.bullets.map((b) => `• ${b}`).join('\n') + '\n';
        if (s.speaker_notes) out += `[Notas: ${s.speaker_notes}]\n`;
        return out;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Presentación copiada');
  };

  // ─── EXPORT HANDLERS ──────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!presentation) return;
    exportPresentationPDF(presentation.title, presentation.slides, `presentacion_${Date.now()}`);
    toast.success('📕 PDF de slides descargado');
  };

  const handleExportDocPDF = () => {
    if (!presentation) return;
    const sections = presentation.slides.map((s) => ({
      heading: `Slide ${s.slide_number}: ${s.title}`,
      text: [s.subtitle, s.content].filter(Boolean).join('\n'),
      items: [
        ...(s.bullets || []),
        ...(s.stats || []).map((st) => `${st.value} — ${st.label}`),
        ...(s.speaker_notes ? [`Notas: ${s.speaker_notes}`] : []),
      ],
    }));
    exportPDF(presentation.title, sections, `presentacion_doc_${Date.now()}`, {
      author: clientName || 'NELVYON SaaS',
      date: new Date().toLocaleDateString('es-ES'),
      footer: 'Generado por NELVYON SaaS — Presentaciones Élite',
    });
    toast.success('📄 PDF documento descargado');
  };

  const handleExportExcel = () => {
    if (!presentation) return;
    const rows = presentation.slides.map((s) => ({
      Slide: s.slide_number,
      Layout: s.layout,
      Título: s.title,
      Subtítulo: s.subtitle || '',
      Contenido: s.content || '',
      Puntos: (s.bullets || []).join('; '),
      Estadísticas: (s.stats || []).map((st) => `${st.value}: ${st.label}`).join('; '),
      Notas_Presentador: s.speaker_notes || '',
    }));
    exportExcel(rows, `presentacion_${Date.now()}`, 'Slides');
    toast.success('📊 Excel descargado');
  };

  const handleExportCSV = () => {
    if (!presentation) return;
    const rows = presentation.slides.map((s) => ({
      Slide: s.slide_number,
      Título: s.title,
      Subtítulo: s.subtitle || '',
      Contenido: s.content || '',
      Puntos: (s.bullets || []).join('; '),
      Notas: s.speaker_notes || '',
    }));
    exportCSV(rows, `presentacion_${Date.now()}`);
    toast.success('📄 CSV descargado');
  };

  const handleExportTXT = () => {
    if (!presentation) return;
    let text = `${presentation.title}\n${'='.repeat(50)}\n\n`;
    presentation.slides.forEach((s) => {
      text += `--- Slide ${s.slide_number}: ${s.title} ---\n`;
      if (s.subtitle) text += `${s.subtitle}\n`;
      if (s.content) text += `${s.content}\n`;
      if (s.bullets?.length) text += s.bullets.map((b) => `  • ${b}`).join('\n') + '\n';
      if (s.stats?.length) text += s.stats.map((st) => `  ${st.value} — ${st.label}`).join('\n') + '\n';
      if (s.speaker_notes) text += `  [Notas: ${s.speaker_notes}]\n`;
      text += '\n';
    });
    exportTXT(text, `presentacion_${Date.now()}`);
    toast.success('📝 TXT descargado');
  };

  const handleExportMarkdown = () => {
    if (!presentation) return;
    let md = `# ${presentation.title}\n\n`;
    presentation.slides.forEach((s) => {
      md += `## Slide ${s.slide_number}: ${s.title}\n\n`;
      if (s.subtitle) md += `*${s.subtitle}*\n\n`;
      if (s.content) md += `${s.content}\n\n`;
      if (s.bullets?.length) md += s.bullets.map((b) => `- ${b}`).join('\n') + '\n\n';
      if (s.stats?.length) md += `| Valor | Etiqueta |\n|---|---|\n` + s.stats.map((st) => `| ${st.value} | ${st.label} |`).join('\n') + '\n\n';
      if (s.speaker_notes) md += `> 🗣️ *${s.speaker_notes}*\n\n`;
      md += '---\n\n';
    });
    exportMarkdown(md, `presentacion_${Date.now()}`);
    toast.success('📋 Markdown descargado');
  };

  const handleExportHTML = () => {
    if (!presentation) return;
    let html = `<h1>${presentation.title}</h1>`;
    presentation.slides.forEach((s) => {
      html += `<h2>Slide ${s.slide_number}: ${s.title}</h2>`;
      if (s.subtitle) html += `<p><em>${s.subtitle}</em></p>`;
      if (s.content) html += `<p>${s.content}</p>`;
      if (s.bullets?.length) html += `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`;
      if (s.stats?.length) html += `<table><tr><th>Valor</th><th>Etiqueta</th></tr>${s.stats.map((st) => `<tr><td><strong>${st.value}</strong></td><td>${st.label}</td></tr>`).join('')}</table>`;
      if (s.speaker_notes) html += `<blockquote><small>🗣️ ${s.speaker_notes}</small></blockquote>`;
    });
    exportHTML(html, `presentacion_${Date.now()}`);
    toast.success('🌐 HTML descargado');
  };

  const handleExportJSON = () => {
    if (!presentation) return;
    exportJSON(presentation, `presentacion_${Date.now()}`);
    toast.success('📦 JSON descargado');
  };

  if (authLoading) {
    return (
      <SaasLayout title="Presentaciones" subtitle="Presentaciones de negocios élite">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      </SaasLayout>
    );
  }

  if (!user) {
    return (
      <SaasLayout title="Presentaciones" subtitle="Presentaciones de negocios élite">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Presentation className="w-16 h-16 text-violet-400" />
          <h2 className="text-2xl font-bold text-white">Presentaciones Élite</h2>
          <p className="text-gray-400">Inicia sesión para crear presentaciones profesional</p>
          <Button onClick={login} className="bg-violet-600 hover:bg-violet-700 text-white">Iniciar Sesión</Button>
        </div>
      </SaasLayout>
    );
  }

  const slide = presentation?.slides[currentSlide];
  const gradient = SLIDE_GRADIENTS[currentSlide % SLIDE_GRADIENTS.length];

  return (
    <SaasLayout title="Presentaciones" subtitle="Calidad élite #1 del mundo — Descarga en todos los formatos">
      <InlineServiceDemo serviceKey="presentations" serviceName="Presentaciones" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
            <Presentation className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Presentaciones de Negocios</h1>
            <p className="text-gray-400 text-sm">Genera slides → Descarga en PDF, Excel, CSV, TXT, HTML, JSON, Markdown</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30">
            <Star className="w-3 h-3 mr-1" /> World-Class
          </Badge>
        </div>

        {/* View Mode Buttons + Export */}
        {presentation && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('create')}
              className={viewMode === 'create' ? 'bg-violet-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Crear
            </Button>
            <Button
              variant={viewMode === 'slideshow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('slideshow')}
              className={viewMode === 'slideshow' ? 'bg-violet-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
            >
              <Presentation className="w-4 h-4 mr-1" /> Slideshow
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-violet-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
            >
              <List className="w-4 h-4 mr-1" /> Grid
            </Button>
            <div className="ml-auto flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleCopy} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <Copy className="w-4 h-4 mr-1" /> Copiar
              </Button>
              <Button size="sm" onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white">
                <FileText className="w-4 h-4 mr-1" /> PDF Slides
              </Button>
              <Button size="sm" onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Download className="w-4 h-4 mr-1" /> Más ▾
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuLabel className="text-gray-400 text-xs">Todos los formatos</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={handleExportDocPDF} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-red-400" /> PDF Documento (A4)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-blue-400" /> CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportTXT} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" /> Texto (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportMarkdown} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-purple-400" /> Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportHTML} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-blue-400" /> HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileJson className="w-4 h-4 mr-2 text-amber-400" /> JSON (.json)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* CREATE MODE */}
        {viewMode === 'create' && (
          <div className="space-y-6">
            <div>
              <Label className="text-gray-300 text-sm font-semibold mb-3 block">Tipo de Presentación</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRES_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setSelectedType(pt.value)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedType === pt.value
                        ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pt.color} flex items-center justify-center text-white mb-2`}>
                      {pt.icon}
                    </div>
                    <p className="text-white font-semibold text-sm">{pt.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{pt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Pitch Deck - Serie A" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Cliente</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Empresa ABC" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Sector</Label>
                <Input value={clientSector} onChange={(e) => setClientSector(e.target.value)} placeholder="Tecnología, Salud..." className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Número de Slides</Label>
                <Select value={slidesCount} onValueChange={setSlidesCount}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {['8', '10', '12', '15', '20'].map((n) => (
                      <SelectItem key={n} value={n} className="text-white hover:bg-gray-700">{n} slides</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Brief</Label>
                <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Describe el contenido, puntos clave, audiencia..." className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[80px]" />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedType || !title.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white h-12 text-base"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando presentación élite...</>
              ) : (
                <><Zap className="w-5 h-5 mr-2" /> Generar Presentación World-Class</>
              )}
            </Button>
          </div>
        )}

        {/* SLIDESHOW MODE */}
        {viewMode === 'slideshow' && presentation && slide && (
          <div className="space-y-4">
            <div className={`relative aspect-video rounded-2xl bg-gradient-to-br ${gradient} p-8 md:p-12 flex flex-col justify-center overflow-hidden shadow-2xl`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 max-w-3xl">
                {slide.layout === 'title' || slide.slide_number === 1 ? (
                  <div className="text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{slide.title}</h2>
                    {slide.subtitle && <p className="text-xl text-white/80">{slide.subtitle}</p>}
                    {slide.content && <p className="text-lg text-white/70 mt-4">{slide.content}</p>}
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{slide.title}</h2>
                    {slide.subtitle && <p className="text-lg text-white/80 mb-3">{slide.subtitle}</p>}
                    {slide.content && <p className="text-white/90 leading-relaxed mb-4">{slide.content}</p>}
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul className="space-y-2">
                        {slide.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-3 text-white/90">
                            <span className="w-2 h-2 rounded-full bg-white/60 mt-2 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {slide.stats && slide.stats.length > 0 && (
                      <div className="flex gap-6 mt-6">
                        {slide.stats.map((s, i) => (
                          <div key={i} className="text-center">
                            <p className="text-3xl font-bold text-white">{s.value}</p>
                            <p className="text-sm text-white/70">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="absolute bottom-4 right-6 text-white/40 text-sm">
                {currentSlide + 1} / {presentation.slides.length}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={prevSlide} disabled={currentSlide === 0} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <div className="flex gap-1">
                {presentation.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-violet-500 scale-125' : 'bg-gray-700 hover:bg-gray-600'}`}
                  />
                ))}
              </div>
              <Button variant="outline" onClick={nextSlide} disabled={currentSlide === presentation.slides.length - 1} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {slide.speaker_notes && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-semibold mb-1">NOTAS DEL PRESENTADOR</p>
                  <p className="text-gray-300 text-sm">{slide.speaker_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* GRID MODE */}
        {viewMode === 'grid' && presentation && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {presentation.slides.map((s, i) => {
              const g = SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length];
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); setViewMode('slideshow'); }}
                  className={`aspect-video rounded-lg bg-gradient-to-br ${g} p-3 flex flex-col justify-center text-left hover:ring-2 hover:ring-violet-500/50 transition-all ${i === currentSlide ? 'ring-2 ring-violet-500' : ''}`}
                >
                  <div className="relative z-10">
                    <p className="text-white font-bold text-xs truncate">{s.title}</p>
                    {s.subtitle && <p className="text-white/60 text-[10px] truncate mt-0.5">{s.subtitle}</p>}
                  </div>
                  <p className="text-white/30 text-[9px] mt-auto">{i + 1}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SaasLayout>
  );
}