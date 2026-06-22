import CollectionPageLayout from '../../../components/CollectionPageLayout';
import { createCollectionPage } from '../../../storeData';

const collection = createCollectionPage({
  breadcrumb: "Men's collection",
  title: "Men's Shirt",
  description:
    'A sharper shirt lineup with resort stripes, everyday oxfords, and smart casual finishes.',
  productIds: ['mens-resort-shirt', 'mens-oxford-shirt'],
});

function MensShirtPage(props) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default MensShirtPage;
