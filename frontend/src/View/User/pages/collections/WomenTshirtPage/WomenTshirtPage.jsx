import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Women Western',
  title: "Women's T shirt",
  description:
    'Easy western basics with ribbed fits, relaxed silhouettes, and lighter everyday styling.',
  productIds: ['women-ribbed-tshirt', 'women-oversized-tshirt'],
});

function WomenTshirtPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default WomenTshirtPage;
