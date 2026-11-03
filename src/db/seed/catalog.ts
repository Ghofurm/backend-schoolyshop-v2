import { db } from '../../config/database.js';
import { categories, products, sellers, variants } from '../schema.js';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from './catalog-data.js';

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
const DEFAULT_SIZES = ['All Size'] as const;

function variantsFor(productIndex: number, category: string) {
  const sizes = category === 'Pakaian Sekolah' ? CLOTHING_SIZES : DEFAULT_SIZES;

  return sizes.map((size, sizeIndex) => ({
    size,
    stock: 7 + ((productIndex * 3 + sizeIndex * 5) % 18),
    priceAdjustment: size === 'XL' ? 5000 : size === 'XXL' ? 10000 : 0,
  }));
}

export async function seedCatalog(): Promise<void> {
  const categoryIds = new Map<string, number>();

  for (const category of CATALOG_CATEGORIES) {
    const [row] = await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: category.name },
      })
      .returning({ id: categories.id });

    if (!row) {
      throw new Error(`Failed to seed category ${category.slug}`);
    }

    categoryIds.set(category.name, row.id);
  }

  const sellerIds = new Map<string, number>();
  const sellerRoles = new Map(CATALOG_PRODUCTS.map((product) => [product.seller, product.sellerRole]));

  for (const [name, role] of sellerRoles) {
    const [row] = await db
      .insert(sellers)
      .values({ name, role })
      .onConflictDoUpdate({
        target: sellers.name,
        set: { role },
      })
      .returning({ id: sellers.id });

    if (!row) {
      throw new Error(`Failed to seed seller ${name}`);
    }

    sellerIds.set(name, row.id);
  }

  for (const [index, item] of CATALOG_PRODUCTS.entries()) {
    const categoryId = categoryIds.get(item.category);
    const sellerId = sellerIds.get(item.seller);

    if (!categoryId || !sellerId) {
      throw new Error(`Missing category or seller for product ${item.slug}`);
    }

    const [product] = await db
      .insert(products)
      .values({
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: item.price,
        tag: item.tag,
        featured: item.featured,
        categoryId,
        sellerId,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: item.name,
          description: item.description,
          price: item.price,
          tag: item.tag,
          featured: item.featured,
          categoryId,
          sellerId,
          updatedAt: new Date(),
        },
      })
      .returning({ id: products.id });

    if (!product) {
      throw new Error(`Failed to seed product ${item.slug}`);
    }

    for (const variant of variantsFor(index, item.category)) {
      const sku = `${item.slug}-${variant.size.toLowerCase().replace(/\s+/g, '-')}`;

      await db
        .insert(variants)
        .values({ productId: product.id, sku, ...variant })
        .onConflictDoUpdate({
          target: variants.sku,
          set: {
            productId: product.id,
            size: variant.size,
            stock: variant.stock,
            priceAdjustment: variant.priceAdjustment,
          },
        });
    }
  }

  console.log(
    `Seeded ${CATALOG_CATEGORIES.length} categories, ${sellerRoles.size} sellers, and ${CATALOG_PRODUCTS.length} products`,
  );
}
