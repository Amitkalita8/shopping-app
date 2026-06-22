import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: 'Traditional',
  title: 'Kurti sets',
  description:
    'Coordinated festive and printed kurti sets, each shown inside a dedicated traditional category page.',
  productIds: ['festive-kurti-set', 'printed-kurti-set'],
});

function KurtiSetsPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default KurtiSetsPage;
