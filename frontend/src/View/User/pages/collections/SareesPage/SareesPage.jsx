import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Traditional',
  title: 'Sarees',
  description:
    'The saree page now sits directly under the Traditional menu, without the oversized View as strip.',
  productIds: ['banarasi-saree', 'tissue-saree'],
});

function SareesPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default SareesPage;
