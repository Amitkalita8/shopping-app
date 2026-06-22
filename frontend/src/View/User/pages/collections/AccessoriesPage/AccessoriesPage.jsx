import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Accessories',
  title: 'Accessories',
  description:
    'Jewelry and styling extras now open as their own page from the sidebar instead of sharing space with other categories.',
  productIds: ['temple-jewelry-set', 'embroidered-potli-bag'],
});

function AccessoriesPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default AccessoriesPage;
