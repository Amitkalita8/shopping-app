import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Traditional',
  title: 'Mekhela Sador',
  description:
    'A dedicated Assam-inspired page for Mekhela Sador sets with the same shopping flow as the other collections.',
  productIds: ['mekhela-sador-cream', 'mekhela-sador-ruby'],
});

function MekhelaSadorPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default MekhelaSadorPage;
