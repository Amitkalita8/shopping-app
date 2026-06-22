import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: "Men's collection",
  title: "Men's T shirt",
  description:
    'Soft basics, oversized fits, and clean casual layers for the everyday menswear edit.',
  productIds: ['mens-classic-cotton-tshirt', 'mens-graphic-oversized-tshirt'],
});

function MensTshirtPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default MensTshirtPage;
