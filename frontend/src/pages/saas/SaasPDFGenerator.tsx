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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { InlineServiceDemo } from '@/components/saas/InlineServiceDemo';
import { useI18n } from '@/lib/i18n';
import { client } from '@/lib/api';
import {
  FileText, Download, Loader2, Sparkles, Eye,
  Briefcase, Receipt, ScrollText, BookOpen, FileSpreadsheet,
  Printer, Copy, ChevronRight, Star, Zap, FileJson, FileType,
} from 'lucide-react';
import {
  exportPDF, exportTXT, exportMarkdown, exportHTML, exportJSON, exportCSV, exportExcel,
} from '@/lib/export-utils';

interface PDFSection {
  type: string;
  title?: string;
  content?: string;
  items?: string[];
}

interface GeneratedPDF {
  title: string;
  doc_type: string;
  sections: PDFSection[];
  metadata: Record<string, any>;
}

const DOC_TYPES = [
  { value: 'proposal', label: 'Propuesta Comercial', icon: <Briefcase className="w-5 h-5" />, desc: 'Propuestas que cierran ventas', color: 'from-blue-500 to-cyan-500' },
  { value: 'report', label: 'Informe Ejecutivo', icon: <FileSpreadsheet className="w-5 h-5" />, desc: 'Informes profesionales con datos', color: 'from-purple-500 to-pink-500' },
  { value: 'invoice', label: 'Factura Premium', icon: <Receipt className="w-5 h-5" />, desc: 'Facturas elegantes y detalladas', color: 'from-emerald-500 to-green-500' },
  { value: 'contract', label: 'Contrato', icon: <ScrollText className="w-5 h-5" />, desc: 'Contratos profesionales completos', color: 'from-orange-500 to-amber-500' },
  { value: 'brochure', label: 'Brochure / Catálogo', icon: <BookOpen className="w-5 h-5" />, desc: 'Catálogos visuales de impacto', color: 'from-red-500 to-rose-500' },
  { value: 'whitepaper', label: 'Whitepaper', icon: <FileText className="w-5 h-5" />, desc: 'Documentos técnicos de autoridad', color: 'from-indigo-500 to-violet-500' },
];

const STYLES = [
  { value: 'premium', label: 'Premium Corporativo' },
  { value: 'modern', label: 'Moderno Minimalista' },
  { value: 'creative', label: 'Creativo Bold' },
  { value: 'classic', label: 'Clásico Elegante' },
];

export default function SaasPDFGenerator() {
  const { user, loading: authLoading, login } = useAuth();
  const { ts } = useI18n();
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSector, setClientSector] = useState('');
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState('es');
  const [style, setStyle] = useState('premium');
  const [generating, setGenerating] = useState(false);
  const [generatedPDF, setGeneratedPDF] = useState<GeneratedPDF | null>(null);
  const [docHistory, setDocHistory] = useState<Array<Record<string, unknown>>>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await client.entities.nelvyon_outputs.query({ sort: "-created_at", limit: 20 });
      setDocHistory((res.data?.items as Array<Record<string, unknown>>) || []);
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasPDFGenerator] Error:", err); /* fallback */ }
  }, []);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, loadHistory]);

  const handleGenerate = async () => {
    if (!selectedType || !title.trim()) {
      toast.error('Selecciona un tipo y escribe un título');
      return;
    }
    setGenerating(true);
    setGeneratedPDF(null);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/saas-tools/generate-pdf',
        method: 'POST',
        data: {
          doc_type: selectedType,
          title,
          client_name: clientName,
          client_sector: clientSector,
          content_brief: brief,
          language,
          style,
        },
      });
      setGeneratedPDF(res.data);
      // Persist to backend history
      try {
        await client.entities.nelvyon_outputs.create({
          data: {
            output_type: "pdf",
            title: title,
            content_json: JSON.stringify({ type: selectedType, client: clientName, sector: clientSector, style, language }),
            quality_score: 99,
            status: "completed",
          },
        });
        loadHistory();
      } catch (err) { if (import.meta.env.DEV) console.warn("[SaasPDFGenerator] Error:", err); /* non-critical */ }
      toast.success('✅ Documento generado con calidad élite');
    } catch (err: any) {
      toast.error(err?.data?.detail || 'Error al generar documento');
    } finally {
      setGenerating(false);
    }
  };

  const getFullText = () => {
    if (!generatedPDF) return '';
    return generatedPDF.sections
      .map((s) => {
        let out = '';
        if (s.title) out += `\n## ${s.title}\n`;
        if (s.content) out += `${s.content}\n`;
        if (s.items) out += s.items.map((i) => `• ${i}`).join('\n') + '\n';
        return out;
      })
      .join('\n');
  };

  const handleCopyContent = () => {
    if (!generatedPDF) return;
    navigator.clipboard.writeText(`# ${generatedPDF.title}\n${getFullText()}`);
    toast.success('Contenido copiado al portapapeles');
  };

  const handlePrint = () => window.print();

  // ─── EXPORT HANDLERS ──────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!generatedPDF) return;
    const sections = generatedPDF.sections.map((s) => ({
      heading: s.title,
      text: s.content,
      items: s.items,
    }));
    exportPDF(generatedPDF.title, sections, `documento_${Date.now()}`, {
      author: clientName || 'NELVYON SaaS',
      date: generatedPDF.metadata?.date || new Date().toLocaleDateString('es-ES'),
      footer: 'Generado por NELVYON SaaS — Calidad Élite',
    });
    toast.success('📕 PDF descargado');
  };

  const handleExportTXT = () => {
    if (!generatedPDF) return;
    let text = `${generatedPDF.title}\n${'='.repeat(50)}\n`;
    text += `Tipo: ${DOC_TYPES.find((d) => d.value === generatedPDF.doc_type)?.label || generatedPDF.doc_type}\n`;
    if (generatedPDF.metadata?.date) text += `Fecha: ${generatedPDF.metadata.date}\n`;
    text += `\n${getFullText()}`;
    exportTXT(text, `documento_${Date.now()}`);
    toast.success('📝 TXT descargado');
  };

  const handleExportMarkdown = () => {
    if (!generatedPDF) return;
    let md = `# ${generatedPDF.title}\n\n`;
    md += `> **Tipo:** ${DOC_TYPES.find((d) => d.value === generatedPDF.doc_type)?.label || generatedPDF.doc_type}`;
    if (clientName) md += ` | **Cliente:** ${clientName}`;
    md += '\n\n';
    generatedPDF.sections.forEach((s) => {
      if (s.title) md += `## ${s.title}\n\n`;
      if (s.content) md += `${s.content}\n\n`;
      if (s.items?.length) md += s.items.map((i) => `- ${i}`).join('\n') + '\n\n';
    });
    exportMarkdown(md, `documento_${Date.now()}`);
    toast.success('📋 Markdown descargado');
  };

  const handleExportHTML = () => {
    if (!generatedPDF) return;
    let html = `<h1>${generatedPDF.title}</h1>`;
    html += `<p><span class="badge">${DOC_TYPES.find((d) => d.value === generatedPDF.doc_type)?.label || generatedPDF.doc_type}</span>`;
    if (generatedPDF.metadata?.date) html += ` · ${generatedPDF.metadata.date}`;
    html += '</p>';
    generatedPDF.sections.forEach((s) => {
      if (s.title) html += `<h2>${s.title}</h2>`;
      if (s.content) html += `<p>${s.content.replace(/\n/g, '<br/>')}</p>`;
      if (s.items?.length) html += `<ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    });
    exportHTML(html, `documento_${Date.now()}`);
    toast.success('🌐 HTML descargado');
  };

  const handleExportJSON = () => {
    if (!generatedPDF) return;
    exportJSON(generatedPDF, `documento_${Date.now()}`);
    toast.success('📦 JSON descargado');
  };

  const handleExportExcel = () => {
    if (!generatedPDF) return;
    const rows = generatedPDF.sections.map((s, i) => ({
      '#': i + 1,
      Sección: s.title || '',
      Contenido: s.content || '',
      Puntos: (s.items || []).join('; '),
      Tipo: s.type || '',
    }));
    exportExcel(rows, `documento_${Date.now()}`, 'Documento');
    toast.success('📊 Excel descargado');
  };

  const handleExportCSV = () => {
    if (!generatedPDF) return;
    const rows = generatedPDF.sections.map((s, i) => ({
      '#': i + 1,
      Sección: s.title || '',
      Contenido: s.content || '',
      Puntos: (s.items || []).join('; '),
    }));
    exportCSV(rows, `documento_${Date.now()}`);
    toast.success('📄 CSV descargado');
  };

  if (authLoading) {
    return (
      <SaasLayout title="PDF Generator" subtitle="Generador de documentos élite">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </SaasLayout>
    );
  }

  if (!user) {
    return (
      <SaasLayout title="PDF Generator" subtitle="Generador de documentos élite">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <FileText className="w-16 h-16 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">PDF Generator Élite</h2>
          <p className="text-gray-400">Inicia sesión para generar documentos profesionales</p>
          <Button onClick={login} className="bg-blue-600 hover:bg-blue-700 text-white">Iniciar Sesión</Button>
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout title="PDF Generator" subtitle="Documentos profesionales de calidad élite #1 del mundo">
      <InlineServiceDemo serviceKey="pdf_generator" serviceName="PDF Generator" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Generador de Documentos Profesionales</h1>
            <p className="text-gray-400 text-sm">Genera y descarga en PDF, Excel, CSV, Word, TXT, HTML, JSON, Markdown</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30">
            <Star className="w-3 h-3 mr-1" /> Élite
          </Badge>
        </div>

        <Tabs defaultValue="create" className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
              <Sparkles className="w-4 h-4 mr-1" /> Crear Documento
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400" disabled={!generatedPDF}>
              <Eye className="w-4 h-4 mr-1" /> Preview & Descargar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div>
              <Label className="text-gray-300 text-sm font-semibold mb-3 block">Tipo de Documento</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    onClick={() => setSelectedType(dt.value)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedType === dt.value
                        ? 'border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dt.color} flex items-center justify-center text-white mb-2`}>
                      {dt.icon}
                    </div>
                    <p className="text-white font-semibold text-sm">{dt.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{dt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Título del Documento</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Propuesta de Marketing Digital 2026" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Nombre del Cliente</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej: Empresa ABC" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Sector del Cliente</Label>
                <Input value={clientSector} onChange={(e) => setClientSector(e.target.value)} placeholder="Ej: Tecnología, Salud, Retail..." className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Estilo</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Brief / Instrucciones</Label>
                <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Describe qué debe incluir el documento, puntos clave, datos específicos..." className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[100px]" />
              </div>
              <div>
                <Label className="text-gray-300">Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="es" className="text-white hover:bg-gray-700">Español</SelectItem>
                    <SelectItem value="en" className="text-white hover:bg-gray-700">English</SelectItem>
                    <SelectItem value="fr" className="text-white hover:bg-gray-700">Français</SelectItem>
                    <SelectItem value="pt" className="text-white hover:bg-gray-700">Português</SelectItem>
                    <SelectItem value="de" className="text-white hover:bg-gray-700">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedType || !title.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white h-12 text-base"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando documento élite con Nelvyon...</>
              ) : (
                <><Zap className="w-5 h-5 mr-2" /> Generar Documento Profesional</>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {generatedPDF && (
              <>
                {/* Download Bar */}
                <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Download className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-semibold text-sm">Descargar como:</span>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">
                          <FileText className="w-3 h-3 mr-1" /> PDF
                        </Button>
                        <Button size="sm" onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                          <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                        </Button>
                        <Button size="sm" onClick={handleExportCSV} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                          <FileText className="w-3 h-3 mr-1" /> CSV
                        </Button>
                        <Button size="sm" onClick={handleCopyContent} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </Button>
                        <Button size="sm" onClick={handlePrint} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                          <Printer className="w-3 h-3 mr-1" /> Imprimir
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                              <FileType className="w-3 h-3 mr-1" /> Más ▾
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-800 border-gray-700">
                            <DropdownMenuLabel className="text-gray-400 text-xs">Más formatos</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-700" />
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
                  </CardContent>
                </Card>

                {/* PDF Preview */}
                <Card className="bg-white border-gray-200 print:shadow-none">
                  <CardContent className="p-8 md:p-12 print:p-8">
                    <div className="max-w-3xl mx-auto">
                      <div className="border-b-2 border-blue-600 pb-6 mb-8">
                        <Badge className="bg-blue-100 text-blue-700 border-0 mb-3">
                          {DOC_TYPES.find((d) => d.value === generatedPDF.doc_type)?.label || generatedPDF.doc_type}
                        </Badge>
                        <h1 className="text-3xl font-bold text-gray-900">{generatedPDF.title}</h1>
                        {generatedPDF.metadata?.date && (
                          <p className="text-gray-500 text-sm mt-2">Fecha: {generatedPDF.metadata.date}</p>
                        )}
                      </div>

                      {generatedPDF.sections.map((section, idx) => (
                        <div key={idx} className="mb-6">
                          {section.title && (
                            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <ChevronRight className="w-5 h-5 text-blue-600" />
                              {section.title}
                            </h2>
                          )}
                          {section.content && (
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                          )}
                          {section.items && section.items.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {section.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-700">
                                  <span className="text-blue-600 mt-1">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      <div className="border-t border-gray-200 pt-6 mt-8 text-center">
                        <p className="text-gray-400 text-xs">
                          Generado por NELVYON SaaS · Calidad Élite #1 del Mundo
                        </p>
                        {generatedPDF.metadata?.pages_estimate && (
                          <p className="text-gray-400 text-xs mt-1">
                            ~{generatedPDF.metadata.pages_estimate} páginas · ~{generatedPDF.metadata.word_count_estimate} palabras
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SaasLayout>
  );
}