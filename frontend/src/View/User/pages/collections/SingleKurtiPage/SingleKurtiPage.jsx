import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Traditional',
  title: 'Single kurti',
  description:
    'Everyday and embellished single kurti styles grouped into a simpler browse flow.',
  productIds: ['everyday-single-kurti', 'embroidered-single-kurti'],
});

function SingleKurtiPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default SingleKurtiPage;
