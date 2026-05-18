import { HELP_ARTICLES, HelpArticle } from "@/features/help/content";

export function searchHelpArticles(term: string, module?: string): HelpArticle[] {
  const q = term.trim().toLowerCase();
  return HELP_ARTICLES.filter((article) => {
    if (module && article.module !== module) return false;
    if (!q) return true;
    return [article.title, article.summary, article.body, article.kind].join(" ").toLowerCase().includes(q);
  });
}
