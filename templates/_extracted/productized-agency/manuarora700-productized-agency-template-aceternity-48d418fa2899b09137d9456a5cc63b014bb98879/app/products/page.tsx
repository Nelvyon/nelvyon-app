import { getSEO } from "@/lib/seo";
import { Acebuilder } from "@/components/acebuilder";
import { FAQ } from "@/components/faq";
import { Products } from "@/components/products";

export const metadata = getSEO({
  title: "Products",
  description: "Explore our products and tools built to help you ship faster.",
  path: "/products",
});

const ProductsPage = () => {
  return (
    <div>
      <Acebuilder />
      <Products />
      <FAQ />
    </div>
  )
}

export default ProductsPage