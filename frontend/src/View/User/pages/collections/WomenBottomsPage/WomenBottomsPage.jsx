import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Women Western',
  title: "Women's Bottoms",
  description:
    'Tailored and fluid bottoms built as their own route instead of being mixed into other pages.',
  productIds: ['women-pleated-bottoms', 'women-tailored-bottoms'],
});

function WomenBottomsPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default WomenBottomsPage;
