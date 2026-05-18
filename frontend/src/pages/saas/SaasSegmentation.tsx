import { useState, useCallback, useEffect } from 'react';
import { useI18n } from "@/lib/i18n";
import { useAuth } from '@/contexts/AuthContext';
import SaasLayout from '@/components/SaasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { client, api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { InlineServiceDemo } from '@/components/saas/InlineServiceDemo';
import { createClient } from '@metagptx/web-sdk';
import {
  Database, Loader2, Upload, Sparkles, Users, PieChart,
  Star, Zap, Target, TrendingUp, Plus, Trash2,
  BarChart3, Filter, CheckCircle2, AlertTriangle, Layers,
  Download, FileSpreadsheet, FileText, FileJson, FileType,
} from 'lucide-react';
import {
  exportCSV, exportExcel, exportExcelMultiSheet, exportJSON,
  exportTXT, exportMarkdown, exportHTML, exportPDF, flattenSegmentData,
} from '@/lib/export-utils';

const sdkClient = createClient();

interface Contact {
  name: string;
  email: string;
  company: string;
  sector: string;
  city: string;
  phone: string;
}

interface Segment {
  name: string;
  description: string;
  count: number;
  percentage: string;
  potential_score: number;
  characteristics: string[];
  recommended_actions: string[];
  suggested_campaign: string;
  contact_ids: number[];
}

interface SegmentationResult {
  total_contacts: number;
  segments: Segment[];
  summary: {
    total_segments: number;
    top_segment: string;
    opportunities: string[];
    data_quality_score: number;
    recommendations: string[];
  };
}

const EMPTY_CONTACT: Contact = { name: '', email: '', company: '', sector: '', city: '', phone: '' };

export default function SaasSegmentation() {
  const { ts } = useI18n();
  const { user, loading: authLoading, login } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([{ ...EMPTY_CONTACT }]);
  const [csvText, setCsvText] = useState('');
  const [inputMode, setInputMode] = useState<'manual' | 'csv'>('manual');
  const [segmenting, setSegmenting] = useState(false);
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const loadSavedSegments = useCallback(async () => {
    try {
      const res = await api.getSegmentResults(0, 1);
      const items = (res.items as Array<Record<string, unknown>>) || [];
      if (items.length > 0 && items[0].result_json) {
        const parsed = typeof items[0].result_json === "string"
          ? JSON.parse(items[0].result_json as string)
          : items[0].result_json;
        setResult(parsed as SegmentationResult);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasSegmentation] Error:", err); /* backend unavailable */ }
  }, []);

  useEffect(() => {
    if (user) loadSavedSegments();
  }, [user, loadSavedSegments]);

  const addContact = () => setContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);

  const removeContact = (idx: number) => {
    if (contacts.length <= 1) return;
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateContact = (idx: number, field: keyof Contact, value: string) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const parseCSV = useCallback((text: string): Contact[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h.includes('name') || h.includes('nombre')) obj.name = values[i] || '';
        else if (h.includes('email') || h.includes('correo')) obj.email = values[i] || '';
        else if (h.includes('company') || h.includes('empresa')) obj.company = values[i] || '';
        else if (h.includes('sector') || h.includes('industria') || h.includes('nicho')) obj.sector = values[i] || '';
        else if (h.includes('city') || h.includes('ciudad')) obj.city = values[i] || '';
        else if (h.includes('phone') || h.includes('tel')) obj.phone = values[i] || '';
      });
      return { name: obj.name || '', email: obj.email || '', company: obj.company || '', sector: obj.sector || '', city: obj.city || '', phone: obj.phone || '' };
    }).filter((c) => c.name || c.email || c.company);
  }, []);

  const getActiveContacts = (): Contact[] => {
    if (inputMode === 'manual') return contacts.filter((c) => c.name || c.email || c.company);
    return parseCSV(csvText);
  };

  const handleSegment = async () => {
    const contactsToSegment = getActiveContacts();
    if (contactsToSegment.length === 0) {
      toast.error('Añade al menos un contacto');
      return;
    }
    setSegmenting(true);
    setResult(null);
    try {
      const res = await sdkClient.apiCall.invoke({
        url: '/api/v1/saas-tools/segment-database',
        method: 'POST',
        data: { contacts: contactsToSegment },
      });
      setResult(res.data);
      setSelectedSegment(null);
      toast.success(`✅ ${res.data.segments?.length || 0} segmentos identificados`);
      // Persist to backend segment_results table
      try {
        await api.createSegmentResult({
          total_contacts: res.data.total_contacts || contactsToSegment.length,
          segments_count: res.data.segments?.length || 0,
          top_segment: res.data.summary?.top_segment || "",
          data_quality_score: res.data.summary?.data_quality_score || 0,
          result_json: JSON.stringify(res.data),
          contacts_json: JSON.stringify(contactsToSegment),
          status: "completed",
        });
      } catch (err) { if (import.meta.env.DEV) console.warn("[SaasSegmentation] Error:", err); /* non-critical */ }
    } catch (err: any) {
      toast.error(err?.data?.detail || 'Error al segmentar');
    } finally {
      setSegmenting(false);
    }
  };

  // ─── EXPORT HANDLERS ──────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!result) return;
    const activeContacts = getActiveContacts();
    const segmentRows = flattenSegmentData(result.segments, activeContacts);
    const summaryRows = [{
      Total_Contactos: result.total_contacts,
      Total_Segmentos: result.summary?.total_segments || result.segments.length,
      Top_Segmento: result.summary?.top_segment || '',
      Calidad_Datos: `${result.summary?.data_quality_score || 0}%`,
      Oportunidades: (result.summary?.opportunities || []).join('; '),
      Recomendaciones: (result.summary?.recommendations || []).join('; '),
    }];
    exportExcelMultiSheet([
      { name: 'Segmentos', data: segmentRows },
      { name: 'Resumen', data: summaryRows },
      { name: 'Contactos', data: activeContacts.map((c, i) => ({ '#': i + 1, ...c })) },
    ], `segmentacion_${Date.now()}`);
    toast.success('📊 Excel descargado con 3 hojas');
  };

  const handleExportCSV = () => {
    if (!result) return;
    const rows = flattenSegmentData(result.segments, getActiveContacts());
    exportCSV(rows, `segmentacion_${Date.now()}`);
    toast.success('📄 CSV descargado');
  };

  const handleExportPDF = () => {
    if (!result) return;
    const sections = result.segments.map((seg) => ({
      heading: `${seg.name} — Score: ${seg.potential_score} (${seg.count} contactos, ${seg.percentage})`,
      text: seg.description,
      items: [
        ...(seg.characteristics || []).map((c) => `Característica: ${c}`),
        ...(seg.recommended_actions || []).map((a) => `Acción: ${a}`),
        ...(seg.suggested_campaign ? [`Campaña sugerida: ${seg.suggested_campaign}`] : []),
      ],
    }));
    if (result.summary?.opportunities?.length) {
      sections.push({
        heading: 'Oportunidades Detectadas',
        text: '',
        items: result.summary.opportunities,
      });
    }
    exportPDF(
      'Informe de Segmentación de Base de Datos',
      sections,
      `segmentacion_${Date.now()}`,
      { author: 'NELVYON SaaS', date: new Date().toLocaleDateString('es-ES'), footer: 'Generado por NELVYON SaaS — Segmentación N' }
    );
    toast.success('📕 PDF descargado');
  };

  const handleExportJSON = () => {
    if (!result) return;
    exportJSON({ ...result, contacts: getActiveContacts() }, `segmentacion_${Date.now()}`);
    toast.success('📦 JSON descargado');
  };

  const handleExportTXT = () => {
    if (!result) return;
    let text = `INFORME DE SEGMENTACIÓN\n${'='.repeat(50)}\n`;
    text += `Total contactos: ${result.total_contacts}\nSegmentos: ${result.segments.length}\n\n`;
    result.segments.forEach((seg, i) => {
      text += `${i + 1}. ${seg.name} (Score: ${seg.potential_score})\n`;
      text += `   ${seg.description}\n`;
      text += `   Contactos: ${seg.count} (${seg.percentage})\n`;
      if (seg.characteristics?.length) text += `   Características: ${seg.characteristics.join(', ')}\n`;
      if (seg.recommended_actions?.length) text += `   Acciones: ${seg.recommended_actions.join(', ')}\n`;
      if (seg.suggested_campaign) text += `   Campaña: ${seg.suggested_campaign}\n`;
      text += '\n';
    });
    exportTXT(text, `segmentacion_${Date.now()}`);
    toast.success('📝 TXT descargado');
  };

  const handleExportMarkdown = () => {
    if (!result) return;
    let md = `# Informe de Segmentación\n\n`;
    md += `> **Total contactos:** ${result.total_contacts} | **Segmentos:** ${result.segments.length} | **Calidad datos:** ${result.summary?.data_quality_score || 0}%\n\n`;
    result.segments.forEach((seg, i) => {
      md += `## ${i + 1}. ${seg.name}\n\n`;
      md += `**Score:** ${seg.potential_score} | **Contactos:** ${seg.count} (${seg.percentage})\n\n`;
      md += `${seg.description}\n\n`;
      if (seg.characteristics?.length) {
        md += `### Características\n${seg.characteristics.map((c) => `- ${c}`).join('\n')}\n\n`;
      }
      if (seg.recommended_actions?.length) {
        md += `### Acciones Recomendadas\n${seg.recommended_actions.map((a) => `- ${a}`).join('\n')}\n\n`;
      }
      if (seg.suggested_campaign) md += `> 💡 **Campaña sugerida:** ${seg.suggested_campaign}\n\n`;
      md += '---\n\n';
    });
    exportMarkdown(md, `segmentacion_${Date.now()}`);
    toast.success('📋 Markdown descargado');
  };

  const handleExportHTML = () => {
    if (!result) return;
    let html = `<h1>Informe de Segmentación</h1>`;
    html += `<p><strong>Total contactos:</strong> ${result.total_contacts} · <strong>Segmentos:</strong> ${result.segments.length} · <strong>Calidad:</strong> ${result.summary?.data_quality_score || 0}%</p>`;
    html += `<table><tr><th>Segmento</th><th>Score</th><th>Contactos</th><th>%</th><th>Campaña</th></tr>`;
    result.segments.forEach((seg) => {
      html += `<tr><td>${seg.name}</td><td>${seg.potential_score}</td><td>${seg.count}</td><td>${seg.percentage}</td><td>${seg.suggested_campaign || '—'}</td></tr>`;
    });
    html += `</table>`;
    result.segments.forEach((seg) => {
      html += `<h2>${seg.name}</h2><p>${seg.description}</p>`;
      if (seg.characteristics?.length) html += `<ul>${seg.characteristics.map((c) => `<li>${c}</li>`).join('')}</ul>`;
    });
    exportHTML(html, `segmentacion_${Date.now()}`);
    toast.success('🌐 HTML descargado');
  };

  const handleExportContacts = (format: 'excel' | 'csv') => {
    const activeContacts = getActiveContacts();
    if (!activeContacts.length) { toast.error('No hay contactos'); return; }
    const rows = activeContacts.map((c, i) => ({ '#': i + 1, Nombre: c.name, Email: c.email, Empresa: c.company, Sector: c.sector, Ciudad: c.city, Teléfono: c.phone }));
    if (format === 'excel') {
      exportExcel(rows, `contactos_${Date.now()}`, 'Contactos');
      toast.success('📊 Contactos exportados a Excel');
    } else {
      exportCSV(rows, `contactos_${Date.now()}`);
      toast.success('📄 Contactos exportados a CSV');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (authLoading) {
    return (
      <SaasLayout title="Segmentación" subtitle="Base de datos inteligente">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </SaasLayout>
    );
  }

  if (!user) {
    return (
      <SaasLayout title="Segmentación" subtitle="Base de datos inteligente">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Database className="w-16 h-16 text-emerald-400" />
          <h2 className="text-2xl font-bold text-white">Segmentación Inteligente</h2>
          <p className="text-gray-400">Inicia sesión para segmentar tu base de datos</p>
          <Button onClick={login} className="bg-emerald-600 hover:bg-emerald-700 text-white">Iniciar Sesión</Button>
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout title="Segmentación N" subtitle="Base de datos con segmentación automática por nichos — Élite #1">
      <InlineServiceDemo serviceKey="segmentation" serviceName="Segmentación" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
            <Database className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Base de Datos & Segmentación</h1>
            <p className="text-gray-400 text-sm">Importa contactos → Nelvyon segmenta → Descarga en cualquier formato</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30">
            <Star className="w-3 h-3 mr-1" /> Élite
          </Badge>
        </div>

        <Tabs defaultValue="input" className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="input" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400">
              <Upload className="w-4 h-4 mr-1" /> Importar Datos
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400" disabled={!result}>
              <PieChart className="w-4 h-4 mr-1" /> Segmentos
            </TabsTrigger>
          </TabsList>

          {/* INPUT TAB */}
          <TabsContent value="input" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={inputMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('manual')}
                className={inputMode === 'manual' ? 'bg-emerald-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
              >
                <Plus className="w-4 h-4 mr-1" /> Manual
              </Button>
              <Button
                variant={inputMode === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('csv')}
                className={inputMode === 'csv' ? 'bg-emerald-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}
              >
                <Upload className="w-4 h-4 mr-1" /> CSV / Pegar
              </Button>

              {/* Export contacts button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Download className="w-4 h-4 mr-1" /> Exportar Contactos
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem onClick={() => handleExportContacts('excel')} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" /> Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportContacts('csv')} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-blue-400" /> CSV (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {inputMode === 'manual' ? (
              <div className="space-y-3">
                {contacts.map((contact, idx) => (
                  <Card key={idx} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400 text-xs font-semibold">Contacto #{idx + 1}</span>
                        {contacts.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeContact(idx)} className="text-red-400 hover:bg-red-900/20 h-7 px-2">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-gray-400 text-xs">Nombre</Label>
                          <Input value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} placeholder="Juan Pérez" className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Email</Label>
                          <Input value={contact.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} placeholder="juan@empresa.com" className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Empresa</Label>
                          <Input value={contact.company} onChange={(e) => updateContact(idx, 'company', e.target.value)} placeholder="Empresa ABC" className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Sector / Nicho</Label>
                          <Input value={contact.sector} onChange={(e) => updateContact(idx, 'sector', e.target.value)} placeholder="Tecnología" className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Ciudad</Label>
                          <Input value={contact.city} onChange={(e) => updateContact(idx, 'city', e.target.value)} placeholder="Madrid" className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Teléfono</Label>
                          <Input value={contact.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} placeholder="+34 600..." className="bg-gray-900 border-gray-700 text-white mt-1 h-9 text-sm" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addContact} className="w-full border-dashed border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300">
                  <Plus className="w-4 h-4 mr-1" /> Añadir Contacto
                </Button>
              </div>
            ) : (
              <div>
                <Label className="text-gray-300">Pega tu CSV o datos (nombre, email, empresa, sector, ciudad, teléfono)</Label>
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`nombre,email,empresa,sector,ciudad,telefono\nJuan Pérez,juan@abc.com,ABC Corp,Tecnología,Madrid,+34600111222\nMaría López,maria@xyz.com,XYZ SL,Salud,Barcelona,+34600333444`}
                  className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[200px] font-mono text-sm"
                />
                {csvText && (
                  <p className="text-gray-500 text-xs mt-2">
                    {parseCSV(csvText).length} contactos detectados
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleSegment}
              disabled={segmenting}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white h-12 text-base"
            >
              {segmenting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analizando y segmentando con Nelvyon...</>
              ) : (
                <><Zap className="w-5 h-5 mr-2" /> Segmentar Automáticamente por Nichos</>
              )}
            </Button>
          </TabsContent>

          {/* RESULTS TAB */}
          <TabsContent value="results" className="space-y-4">
            {result && (
              <>
                {/* Export Bar */}
                <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Download className="w-5 h-5 text-emerald-400" />
                      <span className="text-white font-semibold text-sm">Descargar resultados:</span>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                          <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                        </Button>
                        <Button size="sm" onClick={handleExportCSV} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                          <FileText className="w-3 h-3 mr-1" /> CSV
                        </Button>
                        <Button size="sm" onClick={handleExportPDF} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-700 h-8 text-xs">
                          <FileText className="w-3 h-3 mr-1" /> PDF
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
                            <DropdownMenuItem onClick={handleExportJSON} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
                              <FileJson className="w-4 h-4 mr-2 text-amber-400" /> JSON (.json)
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Users className="w-4 h-4" /> Total Contactos
                      </div>
                      <p className="text-2xl font-bold text-white">{result.total_contacts}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Layers className="w-4 h-4" /> Segmentos
                      </div>
                      <p className="text-2xl font-bold text-white">{result.summary?.total_segments || result.segments.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Star className="w-4 h-4" /> Top Segmento
                      </div>
                      <p className="text-sm font-bold text-white truncate">{result.summary?.top_segment || '—'}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <BarChart3 className="w-4 h-4" /> Calidad Datos
                      </div>
                      <p className="text-2xl font-bold text-white">{result.summary?.data_quality_score || 0}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Segments */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-gray-300 font-semibold text-sm flex items-center gap-2">
                      <Filter className="w-4 h-4" /> Segmentos por Nicho
                    </h3>
                    {result.segments.map((seg, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSegment(i)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedSegment === i
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold text-sm truncate">{seg.name}</span>
                          <Badge variant="outline" className={`${getScoreColor(seg.potential_score)} border-0 text-xs`}>
                            {seg.potential_score}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-500 text-xs">{seg.count} contactos</span>
                          <span className="text-gray-600 text-xs">·</span>
                          <span className="text-gray-500 text-xs">{seg.percentage}</span>
                        </div>
                        <Progress value={seg.potential_score} className="mt-2 h-1" />
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-2">
                    {selectedSegment !== null && result.segments[selectedSegment] ? (
                      <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Target className="w-5 h-5 text-emerald-400" />
                              {result.segments[selectedSegment].name}
                            </span>
                            <Badge className={`${getScoreBg(result.segments[selectedSegment].potential_score)} text-white border-0`}>
                              Score: {result.segments[selectedSegment].potential_score}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-300">{result.segments[selectedSegment].description}</p>

                          <div>
                            <h4 className="text-gray-400 text-xs font-semibold mb-2">CARACTERÍSTICAS</h4>
                            <div className="flex flex-wrap gap-2">
                              {result.segments[selectedSegment].characteristics?.map((c, i) => (
                                <Badge key={i} variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-gray-400 text-xs font-semibold mb-2">ACCIONES RECOMENDADAS</h4>
                            <ul className="space-y-1">
                              {result.segments[selectedSegment].recommended_actions?.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {result.segments[selectedSegment].suggested_campaign && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <p className="text-xs text-emerald-400 font-semibold mb-1">CAMPAÑA SUGERIDA</p>
                              <p className="text-gray-300 text-sm">{result.segments[selectedSegment].suggested_campaign}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Sparkles className="w-3 h-3 mr-1" /> Crear Campaña
                            </Button>
                            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                              <TrendingUp className="w-3 h-3 mr-1" /> Analizar Más
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
                          <Target className="w-12 h-12 text-gray-600" />
                          <p className="text-gray-400">Selecciona un segmento para ver detalles</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Opportunities */}
                {result.summary?.opportunities && result.summary.opportunities.length > 0 && (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" /> Oportunidades Detectadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.summary.opportunities.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                            <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SaasLayout>
  );
}