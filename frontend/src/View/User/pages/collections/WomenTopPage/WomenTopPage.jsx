import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Women Western',
  title: "Women's Top",
  description:
    'Satin drapes, wrap shapes, and polished tops styled as a dedicated western category page.',
  productIds: ['women-satin-top', 'women-wrap-top'],
});

function WomenTopPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default WomenTopPage;
