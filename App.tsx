
import React, { useState, useEffect, useMemo } from 'react';
import { Product, TabId, CategoryType } from './types';
import { INITIAL_PRODUCTS } from './services/mockData';
import { fetchProductsFromSheets, checkDataSource } from './services/dataService';
import { TabNavigation } from './components/TabNavigation';
import { SingleSearchView } from './views/SingleSearchView';
import { ModelSearchView } from './views/ModelSearchView';
import { CategoryView } from './views/CategoryView';
import { FilterSearchView } from './views/FilterSearchView';
import { UploadView } from './views/UploadView';
import { ManageView } from './views/ManageView';

type DataSource = 'loading' | 'google-sheets' | 'local-storage' | 'mock-data';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('single');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [error, setError] = useState<string | null>(null);

  // Hide products with no stock from browse views (search / model / category /
  // filter). Manage and Upload still get the full list.
  const visibleProducts = useMemo(
    () => products.filter(p => p.stock > 0),
    [products]
  );

  // Load data from Google Sheets or fallback
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 嘗試從 Google Sheets 載入資料
        console.log('Attempting to load from Google Sheets...');
        const sheetsProducts = await fetchProductsFromSheets();

        if (sheetsProducts.length > 0) {
          setProducts(sheetsProducts);
          setDataSource('google-sheets');
          // 同時存入 localStorage 作為快取
          localStorage.setItem('victor_inventory', JSON.stringify(sheetsProducts));
          localStorage.setItem('victor_inventory_source', 'google-sheets');
          localStorage.setItem('victor_inventory_updated', new Date().toISOString());
          console.log(`Loaded ${sheetsProducts.length} products from Google Sheets`);
        } else {
          throw new Error('No products found in Google Sheets');
        }
      } catch (e) {
        console.warn('Failed to load from Google Sheets, trying localStorage...', e);

        // 嘗試從 localStorage 載入
        const stored = localStorage.getItem('victor_inventory');
        if (stored) {
          try {
            const localProducts = JSON.parse(stored);
            setProducts(localProducts);
            setDataSource('local-storage');
            console.log(`Loaded ${localProducts.length} products from localStorage`);
          } catch (parseError) {
            // 使用 mock data
            setProducts(INITIAL_PRODUCTS);
            setDataSource('mock-data');
            console.log('Loaded mock data');
          }
        } else {
          // 使用 mock data
          setProducts(INITIAL_PRODUCTS);
          setDataSource('mock-data');
          console.log('Loaded mock data');
        }

        setError(e instanceof Error ? e.message : 'データ読み込みに失敗しました');
      }

      setLoading(false);
    };

    loadData();
  }, []);

  // 重新從 Google Sheets 載入資料
  const handleRefreshFromSheets = async () => {
    setLoading(true);
    setError(null);

    try {
      const sheetsProducts = await fetchProductsFromSheets();
      if (sheetsProducts.length > 0) {
        setProducts(sheetsProducts);
        setDataSource('google-sheets');
        localStorage.setItem('victor_inventory', JSON.stringify(sheetsProducts));
        localStorage.setItem('victor_inventory_updated', new Date().toISOString());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リフレッシュに失敗しました');
    }

    setLoading(false);
  };

  const handleInventoryUpdate = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('victor_inventory', JSON.stringify(newProducts));
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => {
      const updated = [...prev, newProduct];
      localStorage.setItem('victor_inventory', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateSubCategory = (category: CategoryType, oldName: string, newName: string) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.category === category && p.subCategory === oldName) {
          return { ...p, subCategory: newName };
        }
        return p;
      });
      localStorage.setItem('victor_inventory', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteSubCategory = (category: CategoryType, subCategoryName: string) => {
    // 刪除該小分類下的所有商品（或將其設為空）
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.category === category && p.subCategory === subCategoryName) {
          return { ...p, subCategory: '' };
        }
        return p;
      });
      localStorage.setItem('victor_inventory', JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-stone-900 border-t-transparent mb-4"></div>
        <div className="text-stone-900 font-bold">データを読み込み中</div>
        <div className="text-stone-500 text-sm mt-2">Google Sheets に接続しています</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* データソース警告（非 Google Sheets 時） */}
      {dataSource !== 'google-sheets' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900 flex items-center justify-between gap-3">
          <span className="font-semibold">
            {dataSource === 'local-storage' && 'ローカルキャッシュを使用中'}
            {dataSource === 'mock-data' && 'デモデータを使用中'}
          </span>
          <button
            onClick={handleRefreshFromSheets}
            className="text-amber-900 underline font-semibold hover:text-amber-950"
          >
            再読み込み
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 pb-tab-bar">
        {/* Browse views: hide stock=0 items so sales staff don't see what's not available.
            Manage / Upload still receive the full product list because the admin needs it. */}
        {activeTab === 'single' && <SingleSearchView products={visibleProducts} />}
        {activeTab === 'model' && <ModelSearchView products={visibleProducts} />}
        {activeTab === 'category' && <CategoryView products={visibleProducts} />}
        {activeTab === 'filter' && <FilterSearchView products={visibleProducts} />}
        {activeTab === 'manage' && (
          <ManageView
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateSubCategory={handleUpdateSubCategory}
            onDeleteSubCategory={handleDeleteSubCategory}
          />
        )}
        {activeTab === 'upload' && (
          <UploadView
            onUpdateInventory={handleInventoryUpdate}
            currentCount={products.length}
            onRefresh={handleRefreshFromSheets}
          />
        )}
      </main>

      <footer className="hidden md:block py-8 text-center text-stone-400 text-xs border-t border-stone-200 bg-white">
        <p>&copy; 2024 Victor Inventory System</p>
        <p className="mt-1 mono">
          {dataSource === 'google-sheets' ? 'Google Sheets' :
           dataSource === 'local-storage' ? 'Local Cache' : 'Demo'}
          {' · '}表示中 {visibleProducts.length} / 全 {products.length}
        </p>
      </footer>
    </div>
  );
};

export default App;
